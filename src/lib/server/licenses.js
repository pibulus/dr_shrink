// Checkouts and licenses on the KV store.
//   checkout:<id>            { id, status, claimTokenHash, claimExpiresAt, codeHash, providerOrderId, ... }
//   order:<providerOrderId>  checkoutId
//   license:<codeHash>       { id, codeHash, checkoutId, source, createdAt }
//   phrase:<phraseHash>      codeHash
//   vouchers                 { minted: n }
import crypto from "node:crypto";
import * as store from "./store.js";
import {
  generateLicenseCode,
  hashCode,
  hashPhrase,
  licenseIdForCheckout,
  normalizeCode,
  normalizePhrase,
  phraseForCode,
} from "./licenseCrypto.js";
import { voucherLimit } from "./env.js";

export const CLAIM_TTL_MS = 2 * 60 * 60 * 1000;

export async function saveCheckout(checkout) {
  await store.set(`checkout:${checkout.id}`, checkout);
  if (checkout.providerOrderId) {
    await store.set(`order:${checkout.providerOrderId}`, checkout.id);
  }
}

export function getCheckout(id) {
  return store.get(`checkout:${id}`);
}

export async function getCheckoutByOrderId(orderId) {
  const id = await store.get(`order:${orderId}`);
  return id ? getCheckout(id) : null;
}

export function isClaimExpired(checkout) {
  const t = Date.parse(checkout?.claimExpiresAt || "");
  return !Number.isFinite(t) || t <= Date.now();
}

/** Flip a checkout to paid once. Returns the checkout, or null if unknown. */
export async function markPaid(orderId, payment) {
  const id = await store.get(`order:${orderId}`);
  if (!id) return null;
  return store.update(`checkout:${id}`, (c) => {
    if (!c) return undefined;
    if (c.status === "paid") return undefined;
    return {
      ...c,
      status: "paid",
      paidAt: new Date().toISOString(),
      providerPaymentId: payment?.id || null,
      buyerEmail: payment?.buyer_email_address || null,
    };
  });
}

/** Idempotent: the webhook and the success poll can both call this. */
export async function createLicenseForCheckout(checkout) {
  const code = generateLicenseCode(checkout.id);
  const codeHash = hashCode(code);
  const phrase = phraseForCode(code);
  const license = await store.update(`license:${codeHash}`, (existing) => {
    if (existing) return undefined;
    return {
      id: licenseIdForCheckout(checkout.id),
      codeHash,
      checkoutId: checkout.id,
      source: "square",
      createdAt: new Date().toISOString(),
    };
  });
  await store.set(`phrase:${hashPhrase(phrase)}`, codeHash);
  return { license, code, phrase };
}

/** Look a license up by DS code, bare hex, or the four words. */
export async function findLicense(input) {
  const code = normalizeCode(input);
  if (code) {
    const license = await store.get(`license:${hashCode(code)}`);
    return license ? { license, code, phrase: phraseForCode(code) } : null;
  }
  const phrase = normalizePhrase(input);
  if (!phrase) return null;
  const codeHash = await store.get(`phrase:${hashPhrase(phrase)}`);
  if (!codeHash) return null;
  const license = await store.get(`license:${codeHash}`);
  if (!license?.checkoutId) return null;
  const realCode = generateLicenseCode(license.checkoutId);
  return { license, code: realCode, phrase };
}

/** A voucher word mints a fresh personal license, up to the cap. */
export async function createVoucherLicense() {
  const counter = await store.update("vouchers", (v) => {
    const minted = (v?.minted || 0) + 1;
    if (minted > voucherLimit()) {
      const e = new Error("That unlock word has been used up.");
      e.code = "VOUCHER_LIMIT";
      throw e;
    }
    return { minted };
  });
  const seed = `voucher:${crypto.randomUUID()}:${counter.minted}`;
  const checkout = { id: seed, status: "paid", source: "voucher" };
  const made = await createLicenseForCheckout(checkout);
  made.license.source = "voucher";
  await store.set(`license:${made.license.codeHash}`, made.license);
  return made;
}
