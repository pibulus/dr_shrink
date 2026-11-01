// Server config, read once per call so a systemd EnvironmentFile change lands
// on restart without a rebuild. Reports `configured` booleans only — values
// never leave this module.
import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";

const t = (v) => (typeof v === "string" ? v.trim() : "");

export function squareConfig() {
  return {
    environment:
      t(env.SQUARE_ENVIRONMENT) === "production" ? "production" : "sandbox",
    accessToken: t(env.SQUARE_ACCESS_TOKEN),
    locationId: t(env.SQUARE_LOCATION_ID),
    apiVersion: t(env.SQUARE_API_VERSION) || "2026-01-22",
    webhookSignatureKey: t(env.SQUARE_WEBHOOK_SIGNATURE_KEY),
    notificationUrl: t(env.SQUARE_WEBHOOK_NOTIFICATION_URL),
  };
}

export function isCheckoutConfigured() {
  const c = squareConfig();
  return Boolean(c.accessToken && c.locationId && hasSecret());
}

export function isWebhookConfigured() {
  return Boolean(squareConfig().webhookSignatureKey && hasSecret());
}

export function hasSecret() {
  return t(env.PASSPORT_LICENSE_SECRET).length >= 16;
}

export function licenseSecret() {
  const s = t(env.PASSPORT_LICENSE_SECRET);
  if (s.length < 16)
    throw new Error("PASSPORT_LICENSE_SECRET is not configured");
  return s;
}

export function appOrigin(event) {
  return t(publicEnv.PUBLIC_APP_URL) || t(env.APP_URL) || event.url.origin;
}

export function dataDir() {
  return t(env.DRSHRINK_DATA_DIR) || "./data";
}

export function storeKind() {
  return t(env.DRSHRINK_STORE) === "memory" ? "memory" : "filesystem";
}

export function voucherWords() {
  return t(env.SUPPORTER_UNLOCK_CODES)
    .split(",")
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);
}

export function voucherLimit() {
  const n = Number(env.SUPPORTER_VOUCHER_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

export function rateLimitConfig() {
  const max = Number(env.API_RATE_LIMIT);
  const windowMs = Number(env.API_RATE_WINDOW_MS);
  return {
    max: Number.isFinite(max) && max >= 0 ? max : 30,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
  };
}
