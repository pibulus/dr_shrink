// ===================================================================
// HISTORY — recent compressions (stats persisted, blobs cached separately)
// ===================================================================
// Stats live in localStorage (lightweight, persists forever). The actual
// compressed blobs live in IndexedDB via blobCache.js (30-min TTL, 10 max).
// Each history entry carries a blobId that links back to the cache.
// Once the cache TTL expires, the entry stays visible but isn't re-downloadable.

import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getCache } from "./blobCache.js";

const KEY = "drshrink-history";
const MAX_ENTRIES = 25;

function load() {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const history = writable(load());

function persist(list) {
  if (browser) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* quota / private mode — ignore */
    }
  }
}

/**
 * Record one finished compression result (the shape from compressService).
 * @param {{name,inputSize,outputSize,saved,ratio,grew,note}} r
 * @param {string} [blobId] — cache key for re-download (from blobCache)
 */
export function recordHistory(r, blobId) {
  if (!r) return;
  const entry = {
    name: r.name,
    inputSize: r.inputSize,
    outputSize: r.outputSize,
    saved: Math.max(0, r.saved),
    pct: r.ratio ? Math.round((1 - r.ratio) * 100) : 0,
    grew: !!r.grew,
    note: r.note || "",
    blobId: blobId || null,
    at: nowMs(),
  };
  history.update((list) => {
    const next = [entry, ...list].slice(0, MAX_ENTRIES);
    persist(next);
    return next;
  });
}

export function clearHistory() {
  history.set([]);
  persist([]);
}

// Date.now() is fine in app code (only the workflow sandbox forbids it).
function nowMs() {
  return Date.now();
}

/** Total bytes saved across all recorded jobs. */
export function totalSaved(list) {
  return list.reduce((a, e) => a + (e.saved || 0), 0);
}

/**
 * Try to fetch a cached blob for a history entry so it can be re-downloaded.
 * Returns { blob, name } or null if the cache TTL has expired.
 */
export async function retryDownload(entry) {
  if (!entry?.blobId) return null;
  return getCache(entry.blobId);
}

/**
 * A cache miss means the 30-min window closed — drop the stale blobId so the
 * re-download button disappears instead of silently doing nothing forever.
 */
export function markExpired(entry) {
  if (!entry?.blobId) return;
  history.update((list) => {
    const next = list.map((e) =>
      e.blobId === entry.blobId ? { ...e, blobId: null } : e,
    );
    persist(next);
    return next;
  });
}
