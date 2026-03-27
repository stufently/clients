import { Portal } from "@angular/cdk/portal";
import { Injectable, computed, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class DrawerService {
  private readonly _stack = signal<Portal<unknown>[]>([]);

  /** The portal at the top of the stack — rendered by LayoutComponent. */
  readonly portal = computed(() => this._stack().at(-1) ?? undefined);

  /** Number of portals currently in the stack. */
  readonly stackDepth = computed(() => this._stack().length);

  /**
   * The drawer's preferred push-mode column width in px.
   * Declared by the drawer content (e.g. bit-dialog) via declarePushWidth().
   * Zero when no drawer is active or the width has not been declared yet.
   */
  readonly pushWidthPx = signal(0);

  /**
   * Whether the drawer is currently in push mode (occupying its own grid column).
   * Set by LayoutComponent via ResizeObserver; read by the drawer content for display.
   */
  readonly isPushMode = signal(false);

  /** Open a new drawer, replacing any existing stack. */
  open(portal: Portal<unknown>) {
    this._stack.set([portal]);
  }

  /** Push a portal onto the stack without closing the current drawer. */
  push(portal: Portal<unknown>) {
    this._stack.update((s) => [...s, portal]);
  }

  /** Pop the top portal off the stack. No-op if the stack is empty. */
  pop() {
    this._stack.update((s) => s.slice(0, -1));
    if (this._stack().length === 0) {
      this.pushWidthPx.set(0);
      this.isPushMode.set(false);
    }
  }

  /** Close and clear the entire stack. */
  clearStack() {
    this._stack.set([]);
    this.pushWidthPx.set(0);
    this.isPushMode.set(false);
  }

  /** @deprecated Use clearStack(). Kept for any external callers; clears the stack if the portal is present. */
  close(portal: Portal<unknown>) {
    if (this._stack().includes(portal)) {
      this.clearStack();
    }
  }

  /**
   * Called by drawer content components (e.g. bit-dialog) to declare their natural
   * push-mode column width so LayoutComponent can make accurate push/overlay decisions
   * without measuring the DOM (which is unreliable when the column is 1fr).
   */
  declarePushWidth(px: number) {
    this.pushWidthPx.set(px);
  }
}
