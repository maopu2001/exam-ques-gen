/**
 * Client-Side Persistent Cache Manager for TeX Live WASM Engine & Fonts
 * Preloads all LaTeX assets on initial web app launch and caches them with a 30-day TTL.
 */

import {
  hasAllBinaryAssets,
  hasCurrentCompilerBundleVersion,
  setCompilerBundleVersion,
} from "./binary-cache";
import { COMPILER_BUNDLE_VERSION } from "./bundle-registry";
import { hasAllStylesInDB } from "./styles-cache";

const DB_NAME = "BusyTexFontDB";
const STORE_NAME = "fonts";
const DB_VERSION = 1;
const FONT_KEY = "kalpurush_font_v1";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TIMESTAMP_KEY = "busytex_cache_timestamp_v1";
const VERSION_KEY = "busytex_compiler_bundle_version";

export const BUSYTEX_CDN_BASE =
  "https://texlyre.github.io/texlyre-busytex/core/busytex";
export const KALPURUSH_CDN_FONT_URL =
  "https://fonts.maateen.me/kalpurush/Kalpurush-v0.258.ttf";

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  if (bytesPerSec < 1024 * 1024) {
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openFontDB(): Promise<IDBDatabase> {
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

    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Instant synchronous cache pre-check (< 0.2ms).
 * Validates timestamp and compiler bundle version from localStorage.
 */
export function isFastCacheValid(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const saved = localStorage.getItem(TIMESTAMP_KEY);
    const version = localStorage.getItem(VERSION_KEY);
    if (!saved || version !== COMPILER_BUNDLE_VERSION) return false;
    const age = Date.now() - parseInt(saved, 10);
    return age < THIRTY_DAYS_MS;
  } catch {
    return false;
  }
}

/**
 * Checks if 30-day cache timestamp is still valid.
 */
export function isCacheValid(): boolean {
  return isFastCacheValid();
}

/**
 * Marks cache as valid by saving current timestamp, bundle version,
 * and requesting persistent storage on Android/Mobile devices.
 */
export function setCacheValid(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
    setCompilerBundleVersion(COMPILER_BUNDLE_VERSION);

    // Request Android / Mobile browser persistent storage permission
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch {}
}

/**
 * Checks if font key exists in IndexedDB without loading raw bytes into memory.
 */
export async function hasFontInDB(): Promise<boolean> {
  try {
    const db = await openFontDB();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getKey(FONT_KEY);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Lightweight Zero-RAM IndexedDB verification.
 * Verifies font, binary assets, bundle version, and styles in ~2ms.
 */
export async function isAllDataCached(): Promise<boolean> {
  if (!isFastCacheValid()) return false;
  try {
    if (!hasCurrentCompilerBundleVersion()) return false;
    if (!(await hasFontInDB())) return false;
    if (!(await hasAllBinaryAssets())) return false;
    if (!(await hasAllStylesInDB())) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves Kalpurush font bytes to IndexedDB.
 */
export async function saveFontToDB(bytes: Uint8Array): Promise<void> {
  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(bytes, FONT_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Retrieves Kalpurush font bytes from IndexedDB.
 */
export async function getFontFromDB(): Promise<Uint8Array | null> {
  try {
    const db = await openFontDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(FONT_KEY);
      req.onsuccess = () => {
        const res = req.result;
        if (res instanceof Uint8Array) {
          resolve(res);
        } else if (res instanceof ArrayBuffer) {
          resolve(new Uint8Array(res));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
