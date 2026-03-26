import { contextBridge, ipcRenderer } from "electron";

import { MagnifyResponse } from "../autofill/models/magnify-command";

/**
 * Bitwarden Preload script.
 *
 * This file contains the "glue" between the main process and the renderer process. Please ensure
 * that you have read through the following articles before modifying any preload script.
 *
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 * https://www.electronjs.org/docs/latest/api/context-bridge
 */

const ipc = {
  /**
   * Send a command to the Bitwarden renderer and get results back.
   */
  sendCommand: (command: string, input: string): Promise<MagnifyResponse> =>
    ipcRenderer.invoke("autofill.magnifyCommand", { command, input }),
  chrome: () => process.versions.chrome,
};

contextBridge.exposeInMainWorld("ipc", ipc);
