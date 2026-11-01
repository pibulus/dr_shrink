// Shared between the checkout routes, the success page and the client.
export const CLAIM_HEADER = "x-drshrink-checkout-claim";
export const CLAIM_STORAGE_PREFIX = "drshrink_checkout_claim_"; // sessionStorage
export const POLL_INTERVAL_MS = 2500;
export const MAX_POLLS = 24;
export const NOT_CONFIGURED =
  "Checkout needs server setup first. Passkeys still work.";
