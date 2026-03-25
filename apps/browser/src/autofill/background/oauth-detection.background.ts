import { LogService } from "@bitwarden/common/platform/abstractions/log.service";

import { BrowserApi } from "../../platform/browser/browser-api";

import NotificationBackground from "./notification.background";

/**
 * Tracks an in-progress SSO/OAuth flow for a single tab.
 */
interface OAuthFlowState {
  /** The tab that initiated the OAuth flow (the relying-party site). */
  originTab: chrome.tabs.Tab;
  /** URL of the relying-party site that started the flow. */
  originUrl: string;
  /** SSO provider name (e.g. "Google"). */
  ssoProvider: string;
  /** Email address scraped from the SSO consent screen, if available. */
  email?: string;
}

/** URL patterns that indicate a Google OAuth flow. */
const GOOGLE_OAUTH_URL_FILTER: chrome.webRequest.RequestFilter = {
  urls: ["*://accounts.google.com/o/oauth2/*", "*://accounts.google.com/v3/signin/*"],
  types: ["main_frame", "sub_frame"],
};

/**
 * URL pattern for the Google account consent/confirmation page where we
 * can scrape the authenticated email address.
 */
const GOOGLE_SIGNIN_CONSENT_PATTERN = "accounts.google.com/signin/oauth";

/**
 * Standalone function executed inside the Google consent page via
 * chrome.scripting.executeScript. Must be fully self-contained —
 * no closures over outer variables.
 */
function scrapeGoogleEmailFromPage(): { email: string | null; debug: string } {
  try {
    // Primary: data-profile-identifier attribute
    const profileEl = document.querySelector("[data-profile-identifier]");
    if (profileEl) {
      const attrValue = profileEl.getAttribute("data-profile-identifier");
      if (attrValue) {
        return { email: attrValue, debug: "found via data-profile-identifier attr" };
      }
      const text = profileEl.textContent?.trim() ?? "";
      if (text.includes("@")) {
        return { email: text, debug: "found via data-profile-identifier textContent" };
      }
      return {
        email: null,
        debug: `[data-profile-identifier] element found but no email (attr="${attrValue}", text="${text}")`,
      };
    }

    // Last resort: look for any element containing an email-like string
    const bodyText = document.body?.innerText ?? "";
    const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      return {
        email: emailMatch[0],
        debug: `found email via body text regex match`,
      };
    }

    return {
      email: null,
      debug: `no [data-profile-identifier], no jsname=bQIQze, no email in body (${bodyText.length} chars)`,
    };
  } catch (e) {
    return {
      email: null,
      debug: `scraper threw error: ${String(e)}`,
    };
  }
}

export class OAuthDetectionBackground {
  /** Maps SSO tab ID → flow state. */
  private activeFlows = new Map<number, OAuthFlowState>();
  /** Maps SSO tab ID → pending resolveOriginTab promise. */
  private pendingResolves = new Map<number, Promise<void>>();

  constructor(
    private logService: LogService,
    private notificationBackground: NotificationBackground,
  ) {}

  init() {
    this.logService.info("[OAuthDetection] ========================================");
    this.logService.info("[OAuthDetection] Initializing OAuth detection service...");

    // 1. Detect when a Google OAuth flow starts
    chrome.webRequest.onBeforeRequest.addListener(this.handleOAuthRequest, GOOGLE_OAUTH_URL_FILTER);
    this.logService.info(
      "[OAuthDetection] Step 1 ready: webRequest listener for Google OAuth URLs",
    );

    // 2. Detect navigation to the consent page so we can scrape the email
    chrome.webNavigation.onCompleted.addListener(this.handleNavCompleted, {
      url: [{ hostEquals: "accounts.google.com", pathContains: "signin/oauth" }],
    });
    this.logService.info(
      "[OAuthDetection] Step 2 ready: webNavigation listener for consent page (inline DOM scrape)",
    );

    // 3. Detect when the SSO tab closes — trigger save notification
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved);
    this.logService.info("[OAuthDetection] Step 3 ready: tab close listener");

    // 4. Detect when the SSO tab navigates back to the origin (popup stays open)
    chrome.webNavigation.onBeforeNavigate.addListener(this.handleNavBeforeNavigate);
    this.logService.info("[OAuthDetection] Step 4 ready: navigation-away listener");

    this.logService.info("[OAuthDetection] Initialization complete");
    this.logService.info("[OAuthDetection] ========================================");
  }

  /**
   * Step 1: A Google OAuth request was detected. Record the flow.
   */
  private handleOAuthRequest = (details: chrome.webRequest.OnBeforeRequestDetails): undefined => {
    this.logService.info(
      `[OAuthDetection][Step1] webRequest fired — ` +
        `tabId=${details.tabId}, url=${details.url}, type=${details.type}`,
    );

    if (details.tabId < 0) {
      this.logService.info(
        `[OAuthDetection][Step1] Ignoring: tabId ${details.tabId} is invalid (background request)`,
      );
      return;
    }

    if (this.activeFlows.has(details.tabId)) {
      this.logService.info(
        `[OAuthDetection][Step1] Ignoring: already tracking tab ${details.tabId}`,
      );
      return;
    }

    const initiator = details.initiator ?? "unknown";
    this.logService.info(
      `[OAuthDetection][Step1] NEW Google OAuth flow detected ` +
        `in tab ${details.tabId}, initiator="${initiator}"`,
    );

    const promise = this.resolveOriginTab(details.tabId, initiator);
    this.pendingResolves.set(details.tabId, promise);
    void promise.finally(() => this.pendingResolves.delete(details.tabId));
  };

  /**
   * Finds the tab that initiated the OAuth flow.
   */
  private async resolveOriginTab(ssoTabId: number, initiatorOrigin: string): Promise<void> {
    this.logService.info(
      `[OAuthDetection][ResolveOrigin] Looking up origin tab for SSO tab ${ssoTabId}...`,
    );

    try {
      const ssoTab = await BrowserApi.getTab(ssoTabId);
      if (!ssoTab) {
        this.logService.info(
          `[OAuthDetection][ResolveOrigin] Could not get SSO tab ${ssoTabId} — tab may have closed`,
        );
        return;
      }

      this.logService.info(
        `[OAuthDetection][ResolveOrigin] SSO tab info: ` +
          `id=${ssoTab.id}, url="${ssoTab.url}", openerTabId=${ssoTab.openerTabId ?? "none"}`,
      );

      let originTab: chrome.tabs.Tab | undefined;

      // Strategy A: Use openerTabId
      if (ssoTab.openerTabId != null) {
        this.logService.info(
          `[OAuthDetection][ResolveOrigin] Strategy A: trying openerTabId=${ssoTab.openerTabId}`,
        );
        originTab = await BrowserApi.getTab(ssoTab.openerTabId);
        if (originTab) {
          this.logService.info(
            `[OAuthDetection][ResolveOrigin] Strategy A SUCCESS: ` +
              `opener tab ${originTab.id}, url="${originTab.url}"`,
          );
        } else {
          this.logService.info(
            `[OAuthDetection][ResolveOrigin] Strategy A FAILED: opener tab not found`,
          );
        }
      }

      // Strategy B: Search by initiator origin
      if (!originTab && initiatorOrigin !== "unknown") {
        this.logService.info(
          `[OAuthDetection][ResolveOrigin] Strategy B: searching tabs matching "${initiatorOrigin}/*"`,
        );
        const tabs = await chrome.tabs.query({ url: `${initiatorOrigin}/*` });
        this.logService.info(
          `[OAuthDetection][ResolveOrigin] Strategy B: found ${tabs.length} matching tab(s): ` +
            tabs.map((t) => `{id=${t.id}, url="${t.url}"}`).join(", "),
        );
        originTab = tabs.find((t) => t.id !== ssoTabId);
        if (originTab) {
          this.logService.info(
            `[OAuthDetection][ResolveOrigin] Strategy B SUCCESS: ` +
              `matched tab ${originTab.id}, url="${originTab.url}"`,
          );
        } else {
          this.logService.info(
            `[OAuthDetection][ResolveOrigin] Strategy B FAILED: no matching tab (excluding SSO tab)`,
          );
        }
      }

      if (!originTab) {
        this.logService.info(
          `[OAuthDetection][ResolveOrigin] FAILED: could not resolve origin tab for SSO tab ${ssoTabId}. ` +
            `No notification will be shown.`,
        );
        return;
      }

      const flowState: OAuthFlowState = {
        originTab,
        originUrl: originTab.url ?? initiatorOrigin,
        ssoProvider: "Google",
      };
      this.activeFlows.set(ssoTabId, flowState);

      this.logService.info(
        `[OAuthDetection][ResolveOrigin] TRACKING: SSO tab ${ssoTabId} -> ` +
          `origin tab ${originTab.id} (${flowState.originUrl}), provider=${flowState.ssoProvider}`,
      );
      this.logService.info(
        `[OAuthDetection] Active flows: ${this.activeFlows.size} ` +
          `[${Array.from(this.activeFlows.keys()).join(", ")}]`,
      );
    } catch (e) {
      this.logService.error(`[OAuthDetection][ResolveOrigin] Error: ${e}`);
    }
  }

  /**
   * Step 2: The Google consent page finished loading. Scrape the email
   * directly via chrome.scripting.executeScript with an inline function.
   */
  private handleNavCompleted = async (
    details: chrome.webNavigation.WebNavigationFramedCallbackDetails,
  ): Promise<void> => {
    this.logService.info(
      `[OAuthDetection][Step2] webNavigation.onCompleted fired — ` +
        `tabId=${details.tabId}, frameId=${details.frameId}, url=${details.url}`,
    );

    if (details.tabId < 0 || details.frameId !== 0) {
      this.logService.info(
        `[OAuthDetection][Step2] Ignoring: ` +
          `${details.tabId < 0 ? "invalid tabId" : `non-main frame (frameId=${details.frameId})`}`,
      );
      return;
    }

    if (!details.url.includes(GOOGLE_SIGNIN_CONSENT_PATTERN)) {
      this.logService.info(`[OAuthDetection][Step2] Ignoring: URL does not match consent pattern`);
      return;
    }

    // Wait for any in-flight resolveOriginTab from Step 1 to finish
    const pending = this.pendingResolves.get(details.tabId);
    if (pending !== undefined) {
      this.logService.info(`[OAuthDetection][Step2] Waiting for pending origin tab resolution...`);
      await pending;
    }

    const hasFlow = this.activeFlows.has(details.tabId);
    this.logService.info(
      `[OAuthDetection][Step2] Consent page detected! ` +
        `tab=${details.tabId}, hasExistingFlow=${hasFlow}`,
    );

    if (!hasFlow) {
      this.logService.info(
        `[OAuthDetection][Step2] No existing flow — starting origin tab resolution now`,
      );
      await this.resolveOriginTab(details.tabId, "unknown");
    }

    // Scrape immediately, then retry after delays for async-rendered pages
    this.scrapeEmailFromTab(details.tabId, 1);
    setTimeout(() => this.scrapeEmailFromTab(details.tabId, 2), 1500);
    setTimeout(() => this.scrapeEmailFromTab(details.tabId, 3), 3000);
  };

  /**
   * Executes an inline function in the target tab to read the email from the DOM.
   */
  private scrapeEmailFromTab(tabId: number, attempt: number): void {
    const flow = this.activeFlows.get(tabId);
    if (flow?.email) {
      this.logService.info(
        `[OAuthDetection][Step2] Attempt ${attempt}: skipping — email already captured`,
      );
      return;
    }

    this.logService.info(
      `[OAuthDetection][Step2] Attempt ${attempt}: executing inline DOM scrape in tab ${tabId}...`,
    );

    chrome.scripting
      .executeScript({
        target: { tabId },
        func: scrapeGoogleEmailFromPage,
      })
      .then((results) => {
        this.logService.info(
          `[OAuthDetection][Step2] Attempt ${attempt} raw results: ${JSON.stringify(results)}`,
        );
        const result = results?.[0]?.result;
        this.logService.info(
          `[OAuthDetection][Step2] Attempt ${attempt} parsed: ` +
            `email="${result?.email ?? "null"}", debug="${result?.debug ?? "no debug"}"`,
        );

        if (!result?.email) {
          this.logService.info(`[OAuthDetection][Step2] Attempt ${attempt}: no email found yet`);
          return;
        }

        const currentFlow = this.activeFlows.get(tabId);
        if (!currentFlow) {
          this.logService.info(
            `[OAuthDetection][Step2] Attempt ${attempt}: got email "${result.email}" ` +
              `but no active flow for tab ${tabId}. ` +
              `Active flows: [${Array.from(this.activeFlows.keys()).join(", ")}]`,
          );
          return;
        }

        if (currentFlow.email) {
          this.logService.info(
            `[OAuthDetection][Step2] Attempt ${attempt}: email already set to "${currentFlow.email}", skipping`,
          );
          return;
        }

        currentFlow.email = result.email;
        this.logService.info(
          `[OAuthDetection][Step2] EMAIL CAPTURED on attempt ${attempt}: "${result.email}" ` +
            `for SSO flow tab ${tabId} -> origin ${currentFlow.originUrl}`,
        );
      })
      .catch((e) => {
        this.logService.error(
          `[OAuthDetection][Step2] Attempt ${attempt} FAILED for tab ${tabId}: ${e}`,
        );
      });
  }

  /**
   * Step 3: SSO tab was closed. If we have a completed flow (with email),
   * show the save notification on the origin tab.
   */
  private handleTabRemoved = (tabId: number): void => {
    const flow = this.activeFlows.get(tabId);
    if (!flow) {
      return;
    }

    this.logService.info(
      `[OAuthDetection][Step3] SSO tab ${tabId} CLOSED — ` +
        `flow state: email="${flow.email ?? "NOT CAPTURED"}", ` +
        `origin=${flow.originUrl}, provider=${flow.ssoProvider}`,
    );

    this.activeFlows.delete(tabId);
    this.logService.info(`[OAuthDetection] Active flows after removal: ${this.activeFlows.size}`);
    this.triggerSaveNotification(flow);
  };

  /**
   * Step 4: SSO tab navigated back to the origin site (for same-tab OAuth flows
   * or when the popup redirects back before closing).
   */
  private handleNavBeforeNavigate = (
    details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
  ): void => {
    if (details.tabId < 0 || details.frameId !== 0) {
      return;
    }

    const flow = this.activeFlows.get(details.tabId);
    if (!flow) {
      return;
    }

    this.logService.info(
      `[OAuthDetection][Step4] SSO tab ${details.tabId} navigating to: ${details.url} ` +
        `(flow email="${flow.email ?? "NOT YET"}")`,
    );

    if (!details.url.includes("accounts.google.com") && details.url.startsWith("http")) {
      this.logService.info(
        `[OAuthDetection][Step4] SSO tab ${details.tabId} LEFT Google -> ` +
          `navigating to "${details.url}" — FLOW COMPLETE`,
      );
      this.activeFlows.delete(details.tabId);
      this.logService.info(`[OAuthDetection] Active flows after removal: ${this.activeFlows.size}`);
      this.triggerSaveNotification(flow);
    } else {
      this.logService.info(
        `[OAuthDetection][Step4] Still on Google (or non-http) — continuing to track`,
      );
    }
  };

  /**
   * Shows the Bitwarden "save login" notification on the origin tab
   * with the SSO provider and email information.
   */
  private triggerSaveNotification(flow: OAuthFlowState): void {
    this.logService.info(`[OAuthDetection][Notify] ========================================`);
    this.logService.info(`[OAuthDetection][Notify] TRIGGERING save notification:`);
    this.logService.info(`[OAuthDetection][Notify]   Provider: ${flow.ssoProvider}`);
    this.logService.info(`[OAuthDetection][Notify]   Email:    ${flow.email}`);
    this.logService.info(`[OAuthDetection][Notify]   Origin:   ${flow.originUrl}`);
    this.logService.info(
      `[OAuthDetection][Notify]   Tab:      ${flow.originTab.id} ("${flow.originTab.title}")`,
    );
    this.logService.info(`[OAuthDetection][Notify] ========================================`);

    this.notificationBackground
      .pushSsoLoginToQueue(flow.originTab, flow.ssoProvider, flow.email, flow.originUrl)
      .then(() => {
        this.logService.info(`[OAuthDetection][Notify] pushSsoLoginToQueue SUCCEEDED`);
      })
      .catch((e) => {
        this.logService.error(`[OAuthDetection][Notify] pushSsoLoginToQueue FAILED: ${e}`);
      });
  }
}
