// ===================================================================
// SUPPORTER — $9/yr contributor pass (trust-based, client-side)
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

const KEY = "drshrink-supporter";
const KEY_EXPIRES = "drshrink-supporter-expires";
const CODE_PREFIX = "DS-";
const SUPPORTER_TERM_MS = 365 * 24 * 60 * 60 * 1000; // 365 days

// Limits — centralized so they're trivial to adjust.
export const LIMITS = {
  free: {
    maxFileBytes: 25 * 1024 * 1024, // 25 MB per file
    maxBatch: 5, // files per drop
  },
  supporter: {
    maxFileBytes: 100 * 1024 * 1024, // 100 MB per file (realistic for WASM)
    maxBatch: 25, // files per drop
  },
};

function readInitial() {
  if (!browser) return false;
  const flag = localStorage.getItem(KEY) === "true";
  if (!flag) return false;
  // Check expiry
  const raw = localStorage.getItem(KEY_EXPIRES);
  if (raw && Date.now() > parseInt(raw, 10)) {
    // Expired — clear the flag
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_EXPIRES);
    return false;
  }
  return true;
}

export const isSupporter = writable(readInitial());

export function setSupporter(on) {
  if (browser) {
    if (on) {
      localStorage.setItem(KEY, "true");
    } else {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY_EXPIRES);
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
    const expires = Date.now() + SUPPORTER_TERM_MS;
    localStorage.setItem(KEY, "true");
    localStorage.setItem(KEY_EXPIRES, String(expires));
    isSupporter.set(true);
    return true;
  }
  return false;
}

/** Days remaining on the current contributor pass, or 0. */
export function daysRemaining() {
  if (!browser) return 0;
  const raw = localStorage.getItem(KEY_EXPIRES);
  if (!raw) return 0;
  const remaining = parseInt(raw, 10) - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/** Current limits for the given supporter state. */
export function limitsFor(supporter) {
  return supporter ? LIMITS.supporter : LIMITS.free;
}

/**
 * Check a drop against the limits. Returns { ok, reason } — reason is a
 * user-facing string + a flag so the UI can nudge toward Support.
 */
export function checkDrop(files, supporter) {
  const lim = limitsFor(supporter);
  if (files.length > lim.maxBatch) {
    return {
      ok: false,
      gated: true,
      reason: `Free plan handles ${lim.maxBatch} files at once. Support the doc for up to ${LIMITS.supporter.maxBatch}.`,
    };
  }
  const tooBig = files.find((f) => f.size > lim.maxFileBytes);
  if (tooBig) {
    const mb = Math.round(lim.maxFileBytes / (1024 * 1024));
    return {
      ok: false,
      gated: true,
      reason: `"${tooBig.name}" is over the ${mb} MB free limit. Support the doc for bigger files.`,
    };
  }
  return { ok: true };
}
