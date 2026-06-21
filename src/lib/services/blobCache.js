// ===================================================================
// BLOB CACHE — IndexedDB scratchpad for compressed results
// ===================================================================
// Result blobs are too big for localStorage and privacy-first means we
// don't keep them forever. This gives a 30-minute re-download window for
// the last 10 results. Expired entries are cleaned on every write.
//
// localStorage stores only stats (historyService), never files.
// IndexedDB stores the actual compressed blobs temporarily.

import { browser } from "$app/environment";

const DB_NAME = "drshrink-blobs";
const STORE = "blobs";
const TTL = 30 * 60 * 1000; // 30 minutes
const MAX = 10;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!browser) return reject(new Error("not browser"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("at", "at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Generate a unique ID for a cached blob entry. */
export function cacheId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Store a compressed blob for later re-download.
 * Cleans up expired + excess entries as a side effect.
 */
export async function putCache(id, name, type, blob) {
  if (!browser) return;
  const db = await openDB();
  const buffer = await blob.arrayBuffer();
  const now = Date.now();

  // Scan existing entries (readonly tx) to know what to clean.
  const all = await new Promise((r, reject) => {
    const items = [];
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("transaction aborted"));
    const req = tx.objectStore(STORE).index("at").openCursor(null, "prev");
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        items.push(c.value);
        c.continue();
      } else r(items);
    };
    req.onerror = () => reject(req.error);
  });

  // Cleanup + put in a single readwrite tx.
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  for (const item of all) {
    if (now - item.at > TTL) store.delete(item.id);
  }

  const kept = all
    .filter((item) => now - item.at <= TTL)
    .sort((a, b) => b.at - a.at); // newest first
  for (const item of kept.slice(MAX - 1)) {
    store.delete(item.id);
  }

  store.put({ id, buffer, name, type, at: now });

  return new Promise((r, reject) => {
    tx.oncomplete = () => {
      db.close();
      r();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("IndexedDB write failed"));
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("IndexedDB transaction aborted"));
    };
  });
}

/**
 * Retrieve a cached blob + name, or null if expired/missing.
 */
export async function getCache(id) {
  if (!browser) return null;
  const db = await openDB();
  const entry = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!entry) return null;
  if (Date.now() - entry.at > TTL) {
    // lazy-delete on next write — just don't hand it back
    return null;
  }
  return {
    blob: new Blob([entry.buffer], { type: entry.type }),
    name: entry.name,
  };
}
