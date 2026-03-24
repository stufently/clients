import * as path from "path";

import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";

import { WindowMain } from "../../main/window.main";
import { isDev, isMac } from "../../utils";

const SHORTCUT = isMac() ? "Command+Shift+Space" : "Ctrl+Shift+Space";

export class MagnifyMain {
  private win: BrowserWindow | null = null;

  constructor(
    private readonly logService: LogService,
    private readonly windowMain: WindowMain,
  ) {}

  init() {
    app.on("will-quit", () => this.dispose());

    const registered = globalShortcut.register(SHORTCUT, () => this.toggle());
    if (!registered) {
      this.logService.warning(`[Magnify] Failed to register global shortcut: ${SHORTCUT}`);
    } else {
      this.logService.info(`[Magnify] Registered global shortcut: ${SHORTCUT}`);
    }

    ipcMain.on("magnify.command", (_event, payload) => {
      this.windowMain.win?.webContents.send("magnify.command", payload);
    });

    ipcMain.on("magnify.results", (_event, results) => {
      this.win?.webContents.send("magnify.results", results);
    });
  }

  dispose() {
    if (globalShortcut.isRegistered(SHORTCUT)) {
      globalShortcut.unregister(SHORTCUT);
    }
    this.win?.destroy();
    this.win = null;
  }

  private toggle() {
    if (this.win && !this.win.isDestroyed() && this.win.isVisible()) {
      this.win.hide();
    } else {
      this.openWindow();
    }
  }

  private openWindow() {
    if (!this.win || this.win.isDestroyed()) {
      this.win = this.createWindow();
      this.win.once("ready-to-show", () => {
        this.win?.show();
        this.win?.focus();
      });
    } else {
      this.win.show();
      this.win.focus();
    }
  }

  private createWindow(): BrowserWindow {
    const win = new BrowserWindow({
      width: 640,
      height: 520,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      frame: false,
      transparent: isMac(),
      webPreferences: {
        preload: path.join(__dirname, "magnify-preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (isMac()) {
      win.setVibrancy("under-window");
      win.setHasShadow(true);
      win.setWindowButtonVisibility(false);
    } else {
      win.removeMenu();
    }

    win.on("blur", () => win.hide());

    const magnifyUrl = isDev()
      ? "http://localhost:4300"
      : `file://${path.join(__dirname, "magnify/index.html")}`;

    void win.loadURL(magnifyUrl);

    return win;
  }
}
