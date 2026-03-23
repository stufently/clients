import { globalShortcut, ipcMain } from "electron";

import { LogService } from "@bitwarden/logging";

import { WindowMain } from "../../main/window.main";
import { QUICK_SEARCH_IPC_CHANNELS } from "../../vault/models/ipc-channels";

const DEFAULT_SHORTCUT = "Control+Alt+S";

export class QuickSearchMain {
  private blurHandler: (() => void) | null = null;

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
    await this.windowMain.openQuickSearch();

    const qsWin = this.windowMain.quickSearchWin;
    if (qsWin == null) {
      return;
    }

    qsWin.webContents.send(QUICK_SEARCH_IPC_CHANNELS.OPEN);

    this.blurHandler = () => {
      this.blurHandler = null;
      this.windowMain.closeQuickSearch();
      this.windowMain.quickSearchWin?.webContents.send(QUICK_SEARCH_IPC_CHANNELS.BLUR_CLOSE);
    };
    qsWin.once("blur", this.blurHandler);
  }

  private registerIpcListeners() {
    ipcMain.on(QUICK_SEARCH_IPC_CHANNELS.CLOSE, () => {
      const qsWin = this.windowMain.quickSearchWin;
      if (this.blurHandler && qsWin) {
        qsWin.off("blur", this.blurHandler);
        this.blurHandler = null;
      }
      this.windowMain.closeQuickSearch();
    });
  }
}
