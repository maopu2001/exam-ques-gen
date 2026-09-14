import {
  COMPILER_BINARY_ASSETS,
  COMPILER_BUNDLE_VERSION,
  type CompilerBinaryAsset,
} from "./bundle-registry";

const DB_NAME = "BusyTexBinaryDB";
const STORE_NAME = "assets";
const DB_VERSION = 1;
const VERSION_KEY = "busytex_compiler_bundle_version";

function openBinaryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb =
      typeof indexedDB !== "undefined"
        ? indexedDB
        : typeof self !== "undefined"
          ? (self as any).indexedDB
          : null;

    if (!idb) {
      reject(new Error("IndexedDB not available in current environment"));
      return;
    }
    const request = idb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBinaryAssetsToDB(
  assets: Record<string, Uint8Array>,
  bundleVersion = COMPILER_BUNDLE_VERSION,
): Promise<void> {
  const db = await openBinaryDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    for (const [path, bytes] of Object.entries(assets)) {
      store.put(bytes, path);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VERSION_KEY, bundleVersion);
  }
}

export function setCompilerBundleVersion(
  version = COMPILER_BUNDLE_VERSION,
): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VERSION_KEY, version);
  }
}

export function hasCurrentCompilerBundleVersion(): boolean {
  return (
    typeof localStorage !== "undefined" &&
    localStorage.getItem(VERSION_KEY) === COMPILER_BUNDLE_VERSION
  );
}

export async function getBinaryAssetFromDB(
  path: CompilerBinaryAsset,
): Promise<Uint8Array | null> {
  try {
    const db = await openBinaryDB();
    return await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(path);
      request.onsuccess = () => {
        const value = request.result;
        if (value instanceof Uint8Array) resolve(value);
        else if (value instanceof ArrayBuffer) resolve(new Uint8Array(value));
        else resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Lightweight Zero-RAM key verification.
 * Avoids loading 125MB of binary buffers into JS memory during startup cache checks.
 */
export async function hasAllBinaryAssets(): Promise<boolean> {
  try {
    const db = await openBinaryDB();
    return await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = new Set((request.result as string[]) || []);
        const allPresent = COMPILER_BINARY_ASSETS.every((path) =>
          keys.has(path),
        );
        resolve(allPresent);
      };
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
