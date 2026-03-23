import { globalShortcut, ipcMain } from "electron";

import { LogService } from "@bitwarden/logging";

import { WindowMain } from "../../main/window.main";
import { QUICK_SEARCH_IPC_CHANNELS } from "../../vault/models/ipc-channels";

const DEFAULT_SHORTCUT = "Control+Alt+S";

export class QuickSearchMain {
  private blurHandler: (() => void) | null = null;
  private mainWindowFocusHandler: (() => void) | null = null;

  constructor(
    private logService: LogService,
    private windowMain: WindowMain,
  ) {
    this.registerIpcListeners();
  }

  init() {
    const registered = globalShortcut.register(DEFAULT_SHORTCUT, () => {
      void this.triggerOpen();
    });

    if (!registered) {
      this.logService.error(
        `[QuickSearch] Failed to register global shortcut: ${DEFAULT_SHORTCUT}`,
      );
    } else {
      this.logService.debug(`[QuickSearch] Registered global shortcut: ${DEFAULT_SHORTCUT}`);
    }
  }

  dispose() {
    if (globalShortcut.isRegistered(DEFAULT_SHORTCUT)) {
      globalShortcut.unregister(DEFAULT_SHORTCUT);
    }
    ipcMain.removeAllListeners(QUICK_SEARCH_IPC_CHANNELS.CLOSE);
  }

  private async triggerOpen() {
    this.cleanupWindowListeners();

    // Prepare the window (creates/loads if needed, stays hidden)
    await this.windowMain.openQuickSearch();

    const qsWin = this.windowMain.quickSearchWin;
    if (qsWin == null) {
      return;
    }

    // Navigate to /quick-search while the window is still hidden so the user
    // never sees the vault UI flash inside the quick search window.
    qsWin.webContents.send(QUICK_SEARCH_IPC_CHANNELS.OPEN);

    // Wait for Angular to navigate and render before revealing the window.
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Show and focus — user sees /quick-search immediately.
    this.windowMain.showQuickSearch();

    const handleClose = () => {
      this.cleanupWindowListeners();
      this.windowMain.closeQuickSearch();
      this.windowMain.quickSearchWin?.webContents.send(QUICK_SEARCH_IPC_CHANNELS.BLUR_CLOSE);
    };

    // Arm the blur listener immediately — qsWin has not held focus yet so no
    // spurious blur can fire before this line.
    this.blurHandler = handleClose;
    qsWin.once("blur", this.blurHandler);

    // Delay arming the main-window focus listener. On first open from another
    // app, macOS fires a brief activation-focus event on the main window before
    // focus settles on the quick search window. Arming immediately would trigger
    // handleClose() and close the window right away. The 150ms guard is
    // imperceptible to the user and only arms if the window is still open.
    setTimeout(() => {
      if (this.windowMain.win != null && this.blurHandler != null) {
        this.mainWindowFocusHandler = handleClose;
        this.windowMain.win.once("focus", this.mainWindowFocusHandler);
      }
    }, 150);
  }

  private cleanupWindowListeners() {
    const qsWin = this.windowMain.quickSearchWin;
    if (this.blurHandler) {
      qsWin?.off("blur", this.blurHandler);
      this.blurHandler = null;
    }
    if (this.mainWindowFocusHandler) {
      this.windowMain.win?.off("focus", this.mainWindowFocusHandler);
      this.mainWindowFocusHandler = null;
    }
  }

  private registerIpcListeners() {
    ipcMain.on(QUICK_SEARCH_IPC_CHANNELS.CLOSE, () => {
      this.cleanupWindowListeners();
      this.windowMain.closeQuickSearch();
    });
  }
}
