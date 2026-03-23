import { ipcRenderer } from "electron";

import { QUICK_SEARCH_IPC_CHANNELS } from "./models/ipc-channels";

export default {
  onQuickSearchOpen: (fn: () => void) => {
    ipcRenderer.on(QUICK_SEARCH_IPC_CHANNELS.OPEN, () => fn());
  },
  closeQuickSearch: () => {
    ipcRenderer.send(QUICK_SEARCH_IPC_CHANNELS.CLOSE);
  },
};
