import { contextBridge, ipcRenderer } from "electron";

import { MagnifyCipherResult } from "../autofill/models/magnify-command";

const magnify = {
  /**
   * Send a command to the Bitwarden renderer and get results back.
   */
  sendCommand: (
    command: string,
    input: string,
  ): Promise<{ results: MagnifyCipherResult[]; error?: string }> =>
    ipcRenderer.invoke("autofill.magnifyCommand", { command, input }),
};

contextBridge.exposeInMainWorld("magnify", magnify);
