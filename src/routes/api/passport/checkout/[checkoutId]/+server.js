import { json } from "@sveltejs/kit";
import { enforceRateLimit } from "$lib/server/rateLimiter.js";
import { hashSensitive, issueToken } from "$lib/server/licenseCrypto.js";
import {
  getCheckout,
  isClaimExpired,
  createLicenseForCheckout,
} from "$lib/server/licenses.js";
import { CLAIM_HEADER } from "$lib/config/passport.js";
const NO_STORE = { "Cache-Control": "no-store" };

// The success page polls this while Square's webhook lands. Own bucket,
// sized for the poll loop plus a refresh — a paying visitor must never 429.
export async function GET(event) {
  const limited = enforceRateLimit(event, { bucket: "claim", max: 90 });
  if (limited) return limited;

  try {
    const checkout = await getCheckout(event.params.checkoutId);
    if (!checkout) {
      return json(
        {
          error:
            "That checkout isn't on file. Starting again from DrShrink works.",
        },
        { status: 404, headers: NO_STORE },
      );
    }
    if (isClaimExpired(checkout)) {
      return json(
        {
          error:
            "This checkout link has lapsed. Starting again from DrShrink works.",
        },
        { status: 410, headers: NO_STORE },
      );
    }
    const claim = event.request.headers.get(CLAIM_HEADER) || "";
    if (!claim || checkout.claimTokenHash !== hashSensitive(claim)) {
      return json(
        { error: "This link opens in the same browser that started checkout." },
        { status: 403, headers: NO_STORE },
      );
    }
    if (checkout.status !== "paid") {
      return json(
        { status: checkout.status || "pending" },
        { headers: NO_STORE },
      );
    }
    const { license, code, phrase } = await createLicenseForCheckout(checkout);
    return json(
      { status: "paid", code, phrase, token: issueToken(license) },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error(
      "[PassportCheckout] Claim poll failed:",
      error?.message || error,
    );
    return json(
      { error: "Checkout needs a moment, then it opens." },
      { status: 500, headers: NO_STORE },
    );
  }
}
