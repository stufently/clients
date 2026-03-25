import { randomUUID } from "crypto";

import { ipcMain, IpcMainInvokeEvent, globalShortcut, BrowserWindow } from "electron";

import { LogService } from "@bitwarden/logging";

import { WindowMain } from "../../main/window.main";
import { MAGNIFY_IPC_CHANNELS } from "../models/ipc-channels";
import { MagnifyExternalRequest, MagnifyResponse } from "../models/magnify-command";

const RELAY_TIMEOUT_MS = 5000;

export class MainDesktopMagnifyService {
  private MAGNIFY_KEYBOARD_SHORTCUT = "CommandOrControl+Shift+Space";

  constructor(
    private logService: LogService,
    private windowMain: WindowMain,
  ) {}

  async init(): Promise<void> {
    await this.registerIpcListeners();
  }

  async registerIpcListeners() {
    ipcMain.on(MAGNIFY_IPC_CHANNELS.TOGGLE, async (_event, enable: boolean) => {
      if (enable) {
        await this.enableMagnify();
      } else {
        this.disableMagnify();
      }
    });

    // Handle command relay from Magnify renderer → Bitwarden renderer
    ipcMain.handle(
      MAGNIFY_IPC_CHANNELS.COMMAND,
      async (_event: IpcMainInvokeEvent, request: MagnifyExternalRequest) => {
        return this.relayToRenderer(request);
      },
    );
  }

  // Deregister the keyboard shortcut if registered.
  disableMagnify() {
    if (globalShortcut.isRegistered(this.MAGNIFY_KEYBOARD_SHORTCUT)) {
      globalShortcut.unregister(this.MAGNIFY_KEYBOARD_SHORTCUT);
      this.logService.debug("Magnify disabled.");
    } else {
      this.logService.debug("Magnify is not registered, implicitly disabled.");
    }
  }

  dispose() {
    ipcMain.removeAllListeners(MAGNIFY_IPC_CHANNELS.TOGGLE);
    ipcMain.removeHandler(MAGNIFY_IPC_CHANNELS.COMMAND);

    // Also unregister the global shortcut
    this.disableMagnify();
  }

  // Register the current keyboard shortcut if not already registered
  private async enableMagnify() {
    if (globalShortcut.isRegistered(this.MAGNIFY_KEYBOARD_SHORTCUT)) {
      this.logService.debug(
        "Magnify is already enabled with this keyboard shortcut: " + this.MAGNIFY_KEYBOARD_SHORTCUT,
      );
      return;
    }

    const result = globalShortcut.register(this.MAGNIFY_KEYBOARD_SHORTCUT, async () => {
      await this.openMagnify();
    });

    result
      ? this.logService.debug("Magnify enabled.")
      : this.logService.error("Failed to enable Magnify.");
  }

  // Open the magnify window, which is its own project
  private async openMagnify() {
    const win = new BrowserWindow({ width: 800, height: 600 });
    await win.loadFile("magnify/index.html");
  }

  /**
   * Relay a command from the Magnify BrowserWindow to the Bitwarden renderer
   * and wait for a correlated response.
   */
  private relayToRenderer(request: MagnifyExternalRequest): Promise<MagnifyResponse> {
    const correlationId = randomUUID();

    return new Promise<MagnifyResponse>((resolve) => {
      const responseChannel = `${MAGNIFY_IPC_CHANNELS.COMMAND_RESPONSE}.${correlationId}`;

      const timeout = setTimeout(() => {
        ipcMain.removeAllListeners(responseChannel);
        this.logService.warning(
          `[MainDesktopMagnifyService] Timeout waiting for response to ${request.command}`,
        );
        resolve({
          command: request.command,
          correlationId,
          results: [],
          error: "Timeout waiting for Bitwarden renderer response",
        });
      }, RELAY_TIMEOUT_MS);

      ipcMain.once(responseChannel, (_event, response: MagnifyResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.windowMain.win.webContents.send(MAGNIFY_IPC_CHANNELS.COMMAND_REQUEST, {
        command: request.command,
        input: request.input,
        correlationId,
      });
    });
  }
}
