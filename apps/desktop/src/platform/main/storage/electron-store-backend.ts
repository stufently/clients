import * as fs from "fs";

import ElectronStore from "electron-store";

import { NodeUtils } from "@bitwarden/node/node-utils";

import { isWindowsPortable } from "../../../utils";

import { StorageBackend } from "./storage-backend";

export class ElectronStoreBackend implements StorageBackend {
  private store: ElectronStore<Record<string, unknown>>;

  constructor(dir: string) {
    if (!fs.existsSync(dir)) {
      NodeUtils.mkdirpSync(dir, "700");
    }
    const fileMode = isWindowsPortable() ? 0o666 : 0o600;
    this.store = new ElectronStore({
      defaults: {},
      name: "data",
      configFileMode: fileMode,
    });
  }

  read(): Record<string, unknown> {
    return { ...this.store.store };
  }

  update(updater: (store: Record<string, unknown>) => Record<string, unknown>): void {
    this.store.store = updater({ ...this.store.store });
  }

  flush(): void {
    // Writes are synchronous in electron-store, nothing to flush.
  }
}
