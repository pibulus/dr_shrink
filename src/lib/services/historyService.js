// ===================================================================
// HISTORY — recent compressions (stats only, never the files)
// ===================================================================
// We persist a lightweight log of what was shrunk (name, before→after, %,
// when) to localStorage. We deliberately do NOT store the files themselves —
// too big, and privacy-first means nothing lingers on disk.

import { writable } from "svelte/store";
import { browser } from "$app/environment";

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
 */
export function recordHistory(r) {
  if (!r) return;
  const entry = {
    name: r.name,
    inputSize: r.inputSize,
    outputSize: r.outputSize,
    saved: Math.max(0, r.saved),
    pct: r.ratio ? Math.round((1 - r.ratio) * 100) : 0,
    grew: !!r.grew,
    note: r.note || "",
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
