import { config } from "../env";
import { LocalDiskStorage } from "./local-disk";
import type { StorageAdapter } from "./types";

export * from "./types";
export * from "./layout";
export { LocalDiskStorage, normalizeKey, InvalidKeyError } from "./local-disk";

let instance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!instance) {
    instance = new LocalDiskStorage(config.storageRoot, {
      signingSecret: config.signingSecret,
      publicBaseUrl: config.publicBaseUrl,
      defaultTtlHours: config.linkTtlHours,
    });
  }
  return instance;
}

/** Test hook. */
export function setStorage(adapter: StorageAdapter | null): void {
  instance = adapter;
}
