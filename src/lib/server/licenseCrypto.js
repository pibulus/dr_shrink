// Codes, passphrases, tokens. Everything derives from PASSPORT_LICENSE_SECRET
// and the checkout id, so a webhook and a success-page poll racing each other
// mint byte-identical licenses.
import crypto from "node:crypto";
import { licenseSecret } from "./env.js";
import { WORDS } from "./words.js";

export const CODE_PREFIX = "DS";
const CODE_RE = /^DS-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;
const HEX12_RE = /^[A-F0-9]{12}$/;

function hmacHex(value, secret = licenseSecret()) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex")
    .toUpperCase();
}

export function generateClaimToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSensitive(value, secret) {
  return hmacHex(value, secret).toLowerCase();
}

export function generateLicenseCode(seed, secret) {
  const d = hmacHex(`drshrink-license:${seed}`, secret);
  return `${CODE_PREFIX}-${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8, 12)}`;
}

export function licenseIdForCheckout(checkoutId, secret) {
  const hex = hmacHex(
    `drshrink-license-id:${checkoutId}`,
    secret,
  ).toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Canonical DS-XXXX-XXXX-XXXX from a code, bare 12-hex, or ''. */
export function normalizeCode(input) {
  const raw = (input ?? "").toString().trim().toUpperCase();
  if (!raw) return "";
  const compact = raw.replace(/[\s_-]+/g, "").replace(/^DS/, "");
  if (HEX12_RE.test(compact)) {
    return `${CODE_PREFIX}-${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
  }
  return CODE_RE.test(raw) ? raw : "";
}

/** Lowercase, single-spaced words — the passphrase in canonical form, or ''. */
export function normalizePhrase(input) {
  const words = (input ?? "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length === 4 ? words.join(" ") : "";
}

/** Four words, deterministic from the code. Not reversible — the store keeps
 *  a phraseHash → codeHash index for redemption by phrase. */
export function phraseForCode(code) {
  const canonical = normalizeCode(code);
  if (!canonical) throw new Error("Passphrase needs a code");
  const digest = crypto
    .createHash("sha256")
    .update(`drshrink-passkey:${canonical}`)
    .digest();
  const out = [];
  for (let i = 0; i < 4; i++) {
    const n = digest.readUInt16BE(i * 2);
    out.push(WORDS[n % WORDS.length]);
  }
  return out.join(" ");
}

export function hashCode(code, secret) {
  return hashSensitive(normalizeCode(code), secret);
}

export function hashPhrase(phrase, secret) {
  return hashSensitive(`phrase:${normalizePhrase(phrase)}`, secret);
}

// ── token: HS256 JWT, no exp — the Passport is permanent ──
const b64 = (v) => Buffer.from(v).toString("base64url");

export function issueToken(license, secret = licenseSecret()) {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(
    JSON.stringify({
      sub: license.id,
      tier: "passport",
      source: license.source || "square",
      v: 1,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token, secret = licenseSecret()) {
  const [h, b, s] = (token || "").split(".");
  if (!h || !b || !s) return null;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${h}.${b}`)
    .digest("base64url");
  const a = Buffer.from(s, "base64url");
  const e = Buffer.from(expected, "base64url");
  if (a.length !== e.length || !crypto.timingSafeEqual(a, e)) return null;
  try {
    return JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
