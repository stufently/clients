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

    await this.windowMain.openQuickSearch();

    const qsWin = this.windowMain.quickSearchWin;
    if (qsWin == null) {
      return;
    }

    qsWin.webContents.send(QUICK_SEARCH_IPC_CHANNELS.OPEN);

    const handleClose = () => {
      this.cleanupWindowListeners();
      this.windowMain.closeQuickSearch();
      this.windowMain.quickSearchWin?.webContents.send(QUICK_SEARCH_IPC_CHANNELS.BLUR_CLOSE);
    };

    this.blurHandler = handleClose;
    qsWin.once("blur", this.blurHandler);

    if (this.windowMain.win) {
      this.mainWindowFocusHandler = handleClose;
      this.windowMain.win.once("focus", this.mainWindowFocusHandler);
    }
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
