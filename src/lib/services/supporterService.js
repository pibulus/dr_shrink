// ===================================================================
// SUPPORTER — $9/yr stub (gate structure now, real payments later)
// ===================================================================
//
// No payment integration yet. `isSupporter` is a localStorage flag so the
// gating structure exists and limits are easy to tune. Wire a real checkout +
// license check in a later pass; the rest of the app already respects these.

import { writable } from "svelte/store";
import { browser, dev } from "$app/environment";

const KEY = "drshrink-supporter";

// Limits — centralized so they're trivial to adjust.
export const LIMITS = {
  free: {
    maxFileBytes: 25 * 1024 * 1024, // 25 MB per file
    maxBatch: 5, // files per drop
  },
  supporter: {
    maxFileBytes: 500 * 1024 * 1024, // 500 MB per file
    maxBatch: 200,
  },
};

function readInitial() {
  if (!browser) return false;
  return localStorage.getItem(KEY) === "true";
}

export const isSupporter = writable(readInitial());

export function setSupporter(on) {
  if (browser) localStorage.setItem(KEY, on ? "true" : "false");
  isSupporter.set(!!on);
}

// Contributor codes (gifts / your other devices). Placeholder until real
// codes are issued — accepts a small set for now. Real validation lands with
// the payment integration.
const VALID_CODES = new Set([
  "drshrink-friend",
  "shrinkydink",
  "pablo-sent-me",
]);

/** Try to redeem a contributor code. Returns true if it unlocked supporter. */
export function redeemCode(code) {
  // Placeholder codes disabled in production — real validation lands with
  // payment integration. In dev mode the hardcoded set still works for testing.
  if (!dev) return false;
  const c = (code || "").trim().toLowerCase();
  if (VALID_CODES.has(c)) {
    setSupporter(true);
    return true;
  }
  return false;
}

/** Current limits for the given supporter state. */
export function limitsFor(supporter) {
  return supporter ? LIMITS.supporter : LIMITS.free;
}

/**
 * Check a drop against the limits. Returns { ok, reason } — reason is a
 * user-facing string + a flag so the UI can nudge toward Unlock.
 */
export function checkDrop(files, supporter) {
  const lim = limitsFor(supporter);
  if (files.length > lim.maxBatch) {
    return {
      ok: false,
      gated: true,
      reason: `Free plan handles ${lim.maxBatch} files at once. Unlock for up to ${LIMITS.supporter.maxBatch}.`,
    };
  }
  const tooBig = files.find((f) => f.size > lim.maxFileBytes);
  if (tooBig) {
    const mb = Math.round(lim.maxFileBytes / (1024 * 1024));
    return {
      ok: false,
      gated: true,
      reason: `"${tooBig.name}" is over the ${mb} MB free limit. Unlock for bigger files.`,
    };
  }
  return { ok: true };
}
