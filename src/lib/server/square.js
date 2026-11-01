// Square Payment Links (quick_pay) + webhook signature check. Sandbox or
// production by SQUARE_ENVIRONMENT. A Square seller can only charge in its
// location's currency, so the location is asked rather than trusted.
import crypto from "node:crypto";
import { PRICING } from "$lib/config/pricing.js";
import { squareConfig, isCheckoutConfigured } from "./env.js";

function baseUrl(c) {
  return c.environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export class SquareRefusedError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "SquareRefusedError";
    this.details = details;
  }
}

const currencyCache = new Map();
async function chargeCurrency(c) {
  if (currencyCache.has(c.locationId)) return currencyCache.get(c.locationId);
  try {
    const res = await fetch(
      `${baseUrl(c)}/v2/locations/${encodeURIComponent(c.locationId)}`,
      {
        headers: {
          Authorization: `Bearer ${c.accessToken}`,
          "Square-Version": c.apiVersion,
        },
      },
    );
    const payload = await res.json().catch(() => ({}));
    const cur = payload?.location?.currency;
    if (res.ok && /^[A-Z]{3}$/.test(cur || "")) {
      if (cur !== PRICING.currency) {
        console.warn(
          `[Square] Location charges ${cur}; PRICING.currency is ${PRICING.currency}.`,
        );
      }
      currencyCache.set(c.locationId, cur);
      return cur;
    }
    console.error("[Square] Could not read location currency:", payload);
  } catch (e) {
    console.error("[Square] Location lookup failed:", e?.message || e);
  }
  return PRICING.currency;
}

export async function createCheckout({ checkoutId, redirectUrl }) {
  const c = squareConfig();
  if (!isCheckoutConfigured())
    throw new Error("Square checkout is not configured");
  const currency = await chargeCurrency(c);
  const name = PRICING.productName;
  const res = await fetch(`${baseUrl(c)}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.accessToken}`,
      "Square-Version": c.apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotency_key: checkoutId,
      description: `${name} ${checkoutId}`,
      quick_pay: {
        name,
        price_money: { amount: PRICING.amountMinor, currency },
        location_id: c.locationId,
      },
      checkout_options: {
        redirect_url: redirectUrl,
        ask_for_shipping_address: false,
      },
      payment_note: `${name} checkout ${checkoutId}`,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.payment_link?.url) {
    console.error("[Square] Failed to create checkout:", res.status, payload);
    if (res.status >= 400 && res.status < 500)
      throw new SquareRefusedError(
        "Square refused the checkout",
        payload?.errors,
      );
    throw new Error("Could not start Square checkout");
  }
  return {
    paymentLinkId: payload.payment_link.id,
    providerOrderId: payload.payment_link.order_id,
    checkoutUrl: payload.payment_link.long_url || payload.payment_link.url,
    amount: PRICING.amountMinor,
    currency,
  };
}

export function verifyWebhookSignature({
  rawBody,
  signature,
  notificationUrl,
}) {
  const key = squareConfig().webhookSignatureKey;
  if (!key || !signature || !notificationUrl) return false;
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${notificationUrl}${rawBody}`)
    .digest("base64");
  const a = Buffer.from(signature, "base64");
  const e = Buffer.from(expected, "base64");
  return a.length === e.length && crypto.timingSafeEqual(a, e);
}

export function extractPayment(event) {
  const p = event?.data?.object?.payment;
  return p?.id && p?.order_id ? p : null;
}
