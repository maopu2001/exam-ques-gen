import { STYLE_FILENAMES } from "./styles-registry";

const DB_NAME = "BusyTexStyDB";
const STORE_NAME = "styles";
const DB_VERSION = 1;

function openStylesDB(): Promise<IDBDatabase> {
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

export async function saveStylesToDB(
  styles: Record<string, string>,
): Promise<void> {
  const db = await openStylesDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    for (const [filename, content] of Object.entries(styles))
      store.put(content, filename);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

export async function getStylesFromDB(): Promise<Record<string, string>> {
  try {
    const db = await openStylesDB();
    const styles = await new Promise<Record<string, string>>((resolve) => {
      const result: Record<string, string> = {};
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        if (typeof cursor.value === "string")
          result[String(cursor.key)] = cursor.value;
        cursor.continue();
      };
      request.onerror = () => resolve(result);
    });
    db.close();
    return styles;
  } catch {
    return {};
  }
}

export function hasAllStyles(styles: Record<string, string>): boolean {
  return STYLE_FILENAMES.every((filename) => Boolean(styles[filename]?.trim()));
}

export async function hasAllStylesInDB(): Promise<boolean> {
  try {
    const db = await openStylesDB();
    return await new Promise<boolean>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = new Set((request.result as string[]) || []);
        const allPresent = STYLE_FILENAMES.every((filename) =>
          keys.has(filename),
        );
        resolve(allPresent);
      };
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
