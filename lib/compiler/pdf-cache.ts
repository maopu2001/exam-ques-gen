/**
 * Client-Side IndexedDB Cache for Compiled Exam PDFs
 * Stores binary PDF data with 1-hour TTL across page reloads and network disconnects.
 */

const DB_NAME = "ExamStudioCache";
const STORE_NAME = "pdf_builds";
const DB_VERSION = 1;
const CACHE_KEY = "latest_exam_pdf";
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface CachedPdfRecord {
  masterPdfBytes: Uint8Array;
  cqSqPdfBytes?: Uint8Array;
  mcqPdfBytes?: Uint8Array;
  solPdfBytes?: Uint8Array;
  pageCount: number;
  durationMs: number;
  timestamp: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves compiled PDF result into browser IndexedDB with current timestamp.
 */
export async function saveCompiledPdfToCache(record: Omit<CachedPdfRecord, "timestamp">): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry: CachedPdfRecord = {
        ...record,
        timestamp: Date.now(),
      };

      const request = store.put(entry, CACHE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {}
}

/**
 * Retrieves cached PDF result if it was saved within the past 1 hour.
 */
export async function getCachedCompiledPdf(): Promise<CachedPdfRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const request = store.get(CACHE_KEY);
      request.onsuccess = () => {
        const result = request.result as CachedPdfRecord | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        const age = Date.now() - result.timestamp;
        if (age > ONE_HOUR_MS) {
          // Expired (> 1 hour) -> clean up in background
          clearCachedCompiledPdf().catch(() => {});
          resolve(null);
        } else {
          resolve(result);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Manually clears the cached PDF from IndexedDB.
 */
export async function clearCachedCompiledPdf(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {}
}
