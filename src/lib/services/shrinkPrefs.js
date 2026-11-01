// ===================================================================
// SHRINK PREFS — the Passport's dials. Free runs DEFAULT_PREFS, always.
// ===================================================================
// Presets, never sliders. The free tier keeps the one-good-default promise;
// the Passport opens choice. effectivePrefs() is the single gate: whatever is
// stored, a non-Passport run gets the defaults.

import { writable } from "svelte/store";
import { readStorage, writeStorage, removeStorage } from "./storage.js";

const KEY = "drshrink-shrink-prefs";

export const DEFAULT_PREFS = Object.freeze({
  format: "webp", // webp | jpeg | png | avif
  quality: "balanced", // lean | balanced | crisp
  fitUnder: 0, // MB; 0 = off
  maxDim: 3840, // px on the longest side; 0 = original
  audioOnly: false, // video → mp3
  looseBatch: false, // one result per file instead of one zip
});

export const PREF_CHOICES = {
  format: [
    { id: "webp", label: "WebP", hint: "smallest all-rounder" },
    { id: "jpeg", label: "JPEG", hint: "opens anywhere" },
    { id: "png", label: "PNG", hint: "keeps transparency" },
    { id: "avif", label: "AVIF", hint: "newest, tiniest" },
  ],
  quality: [
    { id: "lean", label: "Lean", hint: "smallest files" },
    { id: "balanced", label: "Balanced", hint: "the default" },
    { id: "crisp", label: "Crisp", hint: "closest to source" },
  ],
  fitUnder: [
    { id: 0, label: "Off", hint: "no target" },
    { id: 8, label: "8 MB", hint: "chat uploads" },
    { id: 10, label: "10 MB", hint: "most mail" },
    { id: 25, label: "25 MB", hint: "big mail" },
  ],
  maxDim: [
    { id: 0, label: "Original", hint: "no resize" },
    { id: 3840, label: "4K", hint: "the default" },
    { id: 2560, label: "2K", hint: "screens" },
    { id: 1920, label: "1080p", hint: "sharing" },
  ],
};

const VALID = {
  format: new Set(PREF_CHOICES.format.map((c) => c.id)),
  quality: new Set(PREF_CHOICES.quality.map((c) => c.id)),
  fitUnder: new Set(PREF_CHOICES.fitUnder.map((c) => c.id)),
  maxDim: new Set(PREF_CHOICES.maxDim.map((c) => c.id)),
};

/** Coerce anything into a complete, valid prefs object. */
export function sanitizePrefs(raw) {
  const p = { ...DEFAULT_PREFS };
  if (!raw || typeof raw !== "object") return p;
  for (const k of ["format", "quality", "fitUnder", "maxDim"]) {
    if (VALID[k].has(raw[k])) p[k] = raw[k];
  }
  if (typeof raw.audioOnly === "boolean") p.audioOnly = raw.audioOnly;
  if (typeof raw.looseBatch === "boolean") p.looseBatch = raw.looseBatch;
  return p;
}

function readInitial() {
  const raw = readStorage(KEY);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    return sanitizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export const shrinkPrefs = writable(readInitial());

export function setPref(key, value) {
  shrinkPrefs.update((p) => {
    const next = sanitizePrefs({ ...p, [key]: value });
    writeStorage(KEY, JSON.stringify(next));
    return next;
  });
}

export function resetPrefs() {
  removeStorage(KEY);
  shrinkPrefs.set({ ...DEFAULT_PREFS });
}

/** The gate. Free runs the defaults no matter what is stored. */
export function effectivePrefs(prefs, isSupporter) {
  return isSupporter ? sanitizePrefs(prefs) : { ...DEFAULT_PREFS };
}

/** True when any dial is off its default — drives the "custom" hint. */
export function isCustom(prefs) {
  const p = sanitizePrefs(prefs);
  return Object.keys(DEFAULT_PREFS).some((k) => p[k] !== DEFAULT_PREFS[k]);
}
