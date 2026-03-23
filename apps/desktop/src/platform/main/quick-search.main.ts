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
      this.triggerOpen();
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

  private triggerOpen() {
    if (this.windowMain.win == null) {
      return;
    }

    this.windowMain.openQuickSearch();
    this.windowMain.win.webContents.send(QUICK_SEARCH_IPC_CHANNELS.OPEN);

    this.blurHandler = () => {
      this.blurHandler = null;
      this.windowMain.closeQuickSearch();
      this.windowMain.win?.webContents.send(QUICK_SEARCH_IPC_CHANNELS.BLUR_CLOSE);
    };
    this.windowMain.win.once("blur", this.blurHandler);
  }

  private registerIpcListeners() {
    ipcMain.on(QUICK_SEARCH_IPC_CHANNELS.CLOSE, () => {
      if (this.blurHandler && this.windowMain.win) {
        this.windowMain.win.off("blur", this.blurHandler);
        this.blurHandler = null;
      }
      this.windowMain.closeQuickSearch();
    });
  }
}
