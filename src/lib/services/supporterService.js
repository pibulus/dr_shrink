// ===================================================================
// PASSPORT — the permanent unlock, plus the free/Passport limits.
// ===================================================================
//
// Client side of the Passport. The server (src/routes/api/passport/*) mints
// a DS-XXXX-XXXX-XXXX code + a four-word passkey + an HS256 token after a
// Square payment; this module stores them, exposes the stores the UI reads,
// and handles checkout / redeem / one-tap unlock links. A legacy offline
// whitelist (VALID_CODE_HASHES) still works as a last-ditch fallback.

import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import { readStorage, writeStorage, removeStorage } from "./storage.js";
import {
  CLAIM_HEADER,
  CLAIM_STORAGE_PREFIX,
  NOT_CONFIGURED,
} from "$lib/config/passport.js";

export const SUPPORT_URL = "https://ko-fi.com/madebypablo";

const KEY = "drshrink-supporter";
const KEY_EXPIRES = "drshrink-supporter-expires"; // legacy 365-day stamps
const KEY_CODE = "drshrink-passport-code";
const KEY_PHRASE = "drshrink-passport-phrase";
const KEY_TOKEN = "drshrink-passport-token";
const CODE_PREFIX = "DS-";
// The Passport is a permanent unlock (one payment, no term). Legacy 365-day
// stamps written by older builds are still honoured until they lapse.
const APP_URL = "https://drshrink.app";

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
export const passportCode = writable(
  browser ? readStorage(KEY_CODE) || "" : "",
);
export const passportPhrase = writable(
  browser ? readStorage(KEY_PHRASE) || "" : "",
);

/** Persist a freshly minted or redeemed Passport and flip the flag. */
export function storePassport({ code, phrase, token }) {
  if (browser) {
    writeStorage(KEY, "true");
    removeStorage(KEY_EXPIRES);
    if (code) writeStorage(KEY_CODE, code);
    if (phrase) writeStorage(KEY_PHRASE, phrase);
    if (token) writeStorage(KEY_TOKEN, token);
  }
  if (code) passportCode.set(code);
  if (phrase) passportPhrase.set(phrase);
  isSupporter.set(true);
}

/** Wipe the Passport from this browser (Options → "Forget this passport"). */
export function forgetPassport() {
  if (browser) {
    for (const k of [KEY, KEY_EXPIRES, KEY_CODE, KEY_PHRASE, KEY_TOKEN])
      removeStorage(k);
  }
  passportCode.set("");
  passportPhrase.set("");
  isSupporter.set(false);
}

/** One-tap unlock link for this Passport, or '' when there is none. */
export function unlockUrl() {
  const code = get(passportCode);
  if (!code) return "";
  const origin =
    browser &&
    /^https?:/.test(location.origin) &&
    !/localhost/.test(location.host)
      ? location.origin
      : APP_URL;
  return `${origin}/u/${encodeURIComponent(code)}`;
}

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

/** Offline fallback: the pre-computed whitelist above. */
async function redeemOffline(code) {
  const c = (code || "").trim().toUpperCase();
  if (!c.startsWith(CODE_PREFIX)) return false;
  const hash = await hashCode(c);
  if (!VALID_CODE_HASHES.has(hash)) return false;
  storePassport({ code: c });
  return true;
}

/**
 * Redeem a DS code, bare hex, or the four-word passkey.
 * → { ok: true, code, phrase } | { ok: false, reason }
 */
export async function redeemCode(input) {
  if (!browser) return { ok: false, reason: "Not available here." };
  const value = (input || "").toString().trim();
  if (!value) return { ok: false, reason: "A passkey goes in the box." };
  try {
    const res = await fetch("/api/passport/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.valid) {
      storePassport(data);
      return { ok: true, code: data.code, phrase: data.phrase };
    }
    if (await redeemOffline(value))
      return { ok: true, code: value.toUpperCase(), phrase: "" };
    return {
      ok: false,
      reason: data?.reason || "That passkey didn't match anything on file.",
    };
  } catch {
    if (await redeemOffline(value))
      return { ok: true, code: value.toUpperCase(), phrase: "" };
    return { ok: false, reason: "The passkey check needs a moment." };
  }
}

/**
 * Start a Square checkout: stash the claim token for the success page, then
 * hand the tab to Square. Throws an Error with a friendly line on failure.
 */
export async function startCheckout() {
  if (!browser) throw new Error(NOT_CONFIGURED);
  let res;
  try {
    res = await fetch("/api/passport/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    throw new Error("Checkout needs a moment, then it opens.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.checkoutUrl) {
    throw new Error(data?.error || NOT_CONFIGURED);
  }
  try {
    sessionStorage.setItem(
      CLAIM_STORAGE_PREFIX + data.checkoutId,
      data.claimToken,
    );
  } catch {
    /* the success page can still show the code once the webhook lands */
  }
  window.location.assign(data.checkoutUrl);
  return data;
}

/** Poll a checkout from the success page. Resolves the server's JSON. */
export async function pollCheckout(checkoutId) {
  let claim = "";
  try {
    claim = sessionStorage.getItem(CLAIM_STORAGE_PREFIX + checkoutId) || "";
  } catch {
    /* no sessionStorage → the server will say so */
  }
  const res = await fetch(
    `/api/passport/checkout/${encodeURIComponent(checkoutId)}`,
    {
      headers: { [CLAIM_HEADER]: claim },
      cache: "no-store",
    },
  );
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ...data };
}

/**
 * On load: ?unlock= / ?code= / #unlock= carry a code or passkey (from the
 * /u/<code> link or an email). Redeem it, then strip it from the URL.
 */
export async function handleUrlUnlock() {
  if (!browser) return { unlocked: false };
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code =
    url.searchParams.get("unlock") ||
    url.searchParams.get("code") ||
    hashParams.get("unlock") ||
    hashParams.get("code");
  if (!code) return { unlocked: false };
  const result = await redeemCode(code);
  ["unlock", "code"].forEach((k) => url.searchParams.delete(k));
  url.hash = "";
  history.replaceState(history.state, "", url.pathname + url.search);
  return { unlocked: result.ok, reason: result.ok ? "" : result.reason };
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
