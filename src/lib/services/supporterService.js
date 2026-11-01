// ===================================================================
// SUPPORT — optional tips; legacy/dev contributor codes retained below.
// ===================================================================
//
// No DRM, no server. Contributor gets a code → enters it → SHA-256
// checked against a pre-computed whitelist → localStorage flag + 365-day
// expiry. Codes are 4-word phrases (DS-word-word-word-word, ~33-bit entropy)
// and hashes don't reveal them.
//
// Generate new codes with:  node tools/generate-codes.mjs
// The script prints each code + its SHA-256 hash. Give the CODE to the
// contributor; paste the HASH into VALID_CODE_HASHES below and deploy.

import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { readStorage, writeStorage, removeStorage } from "./storage.js";

export const SUPPORT_URL = "https://ko-fi.com/madebypablo";

const KEY = "drshrink-supporter";
const KEY_EXPIRES = "drshrink-supporter-expires";
const CODE_PREFIX = "DS-";
// The Passport is a permanent unlock (one payment, no term). Legacy 365-day
// stamps written by older builds are still honoured until they lapse.
const SUPPORTER_TERM_MS = null;

const MB = 1024 * 1024;

// Limits — centralized so they're trivial to adjust.
//
// Everything runs in the visitor's browser, so limits cost nothing to raise;
// they exist only to keep the tab out of memory trouble. The free tier is
// meant to feel genuinely generous — a phone's photo roll, a 10-minute
// screen recording, a project folder — before the Passport ever comes up.
// The Passport sells capability (format/quality choice, PDF, more history),
// not permission.
//
// Ceilings that are TECHNICAL, not commercial:
//  - maxFileBytes: ffmpeg.wasm is a single-thread 32-bit build; input + output
//    + decode buffers for a 200 MB video sits comfortably under its heap.
//    500 MB is the realistic edge on desktop; past that it's a coin flip.
//  - maxBatchBytes: a batch zip holds every output AND the finished archive
//    in memory at once (~2× peak). 300 MB is safe on mobile Safari.
export const LIMITS = {
  free: {
    maxFileBytes: 200 * MB, // per file
    maxBatch: 40, // files per drop (folder drops included)
    maxBatchBytes: 300 * MB, // total input per zip batch
  },
  supporter: {
    maxFileBytes: 500 * MB,
    maxBatch: 200,
    maxBatchBytes: 600 * MB,
  },
};

function readInitial() {
  if (!browser) return false;
  const flag = readStorage(KEY) === "true";
  if (!flag) return false;
  // Check expiry
  const raw = readStorage(KEY_EXPIRES);
  if (raw && (!Number.isFinite(Number(raw)) || Date.now() >= Number(raw))) {
    // Expired — clear the flag
    removeStorage(KEY);
    removeStorage(KEY_EXPIRES);
    return false;
  }
  return true;
}

export const isSupporter = writable(readInitial());

export function setSupporter(on) {
  if (browser) {
    if (on) {
      writeStorage(KEY, "true");
    } else {
      removeStorage(KEY);
      removeStorage(KEY_EXPIRES);
    }
  }
  isSupporter.set(!!on);
}

// ── Code validation ────────────────────────────────────────────────

// Pre-computed SHA-256 hashes of valid contributor codes.
// Format: DS-word-word-word-word  (4-word phrase from a 323-word list, ~33-bit entropy).
// Generate new hashes with:  node tools/generate-codes.mjs
const VALID_CODE_HASHES = new Set([
  // --- paste generated hashes below ---
  // "a1b2c3d4e5f6...",
]);

/**
 * SHA-256 hash of a normalized contributor code.
 * Uses Web Crypto (available in secure contexts — HTTPS or localhost).
 */
async function hashCode(code) {
  if (!browser) return "";
  const normalized = (code || "").trim().toUpperCase();
  const buf = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Try to redeem a contributor code. Returns true if it activated supporter. */
export async function redeemCode(code) {
  if (!browser) return false;
  const c = (code || "").trim().toUpperCase();
  if (!c.startsWith(CODE_PREFIX)) return false;

  const hash = await hashCode(c);
  if (VALID_CODE_HASHES.has(hash)) {
    writeStorage(KEY, "true");
    if (SUPPORTER_TERM_MS) {
      writeStorage(KEY_EXPIRES, String(Date.now() + SUPPORTER_TERM_MS));
    } else {
      removeStorage(KEY_EXPIRES);
    }
    isSupporter.set(true);
    return true;
  }
  return false;
}

/** Days remaining on a legacy term-limited pass; 0 when permanent or absent. */
export function daysRemaining() {
  if (!browser) return 0;
  const raw = readStorage(KEY_EXPIRES);
  if (!raw) return 0;
  const remaining = parseInt(raw, 10) - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/** Current limits for the given supporter state. */
export function limitsFor(supporter) {
  return supporter ? LIMITS.supporter : LIMITS.free;
}

/** Whole megabytes, for copy. */
export function limitMB(bytes) {
  return Math.round(bytes / MB);
}

/**
 * Check a drop against the limits. Returns { ok, reason } — reason is a
 * user-facing line that states the ceiling as a plain fact (no bossing).
 */
export function checkDrop(files, supporter) {
  const lim = limitsFor(supporter);
  if (files.length > lim.maxBatch) {
    return {
      ok: false,
      reason: `That's ${files.length} files — one drop takes up to ${lim.maxBatch}.`,
    };
  }
  const tooBig = files.find((f) => f.size > lim.maxFileBytes);
  if (tooBig) {
    return {
      ok: false,
      reason: `"${tooBig.name}" is ${limitMB(tooBig.size)} MB — the ceiling here is ${limitMB(lim.maxFileBytes)} MB per file.`,
    };
  }
  if (files.length > 1) {
    const total = files.reduce((a, f) => a + f.size, 0);
    if (total > lim.maxBatchBytes) {
      return {
        ok: false,
        reason: `${limitMB(total)} MB in one go — a zip batch tops out at ${limitMB(lim.maxBatchBytes)} MB total.`,
      };
    }
  }
  return { ok: true };
}
