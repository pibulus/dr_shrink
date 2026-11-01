import crypto from "node:crypto";
import { json } from "@sveltejs/kit";
import { enforceRateLimit } from "$lib/server/rateLimiter.js";
import { appOrigin, isCheckoutConfigured } from "$lib/server/env.js";
import * as store from "$lib/server/store.js";
import {
  generateClaimToken,
  generateLicenseCode,
  hashCode,
  hashSensitive,
} from "$lib/server/licenseCrypto.js";
import { createCheckout, SquareRefusedError } from "$lib/server/square.js";
import { saveCheckout, CLAIM_TTL_MS } from "$lib/server/licenses.js";
import { NOT_CONFIGURED } from "$lib/config/passport.js";

export async function POST(event) {
  const limited = enforceRateLimit(event, { bucket: "checkout", max: 10 });
  if (limited) return limited;

  if (!isCheckoutConfigured() || !(await store.isWritable())) {
    return json({ error: NOT_CONFIGURED }, { status: 503 });
  }

  let stage = "license";
  try {
    const checkoutId = crypto.randomUUID();
    const claimToken = generateClaimToken();
    const code = generateLicenseCode(checkoutId);
    const redirectUrl = `${appOrigin(event)}/passport/success?checkout_id=${encodeURIComponent(checkoutId)}`;

    stage = "square";
    const sq = await createCheckout({ checkoutId, redirectUrl });

    stage = "store";
    await saveCheckout({
      id: checkoutId,
      provider: "square",
      status: "pending",
      createdAt: new Date().toISOString(),
      claimTokenHash: hashSensitive(claimToken),
      claimExpiresAt: new Date(Date.now() + CLAIM_TTL_MS).toISOString(),
      codeHash: hashCode(code),
      providerCheckoutId: sq.paymentLinkId,
      providerOrderId: sq.providerOrderId,
      amount: sq.amount,
      currency: sq.currency,
    });

    return json({ checkoutId, claimToken, checkoutUrl: sq.checkoutUrl });
  } catch (error) {
    console.error(
      `[PassportCheckout] Failed at ${stage}:`,
      error?.message || error,
      error?.details || "",
    );
    if (error instanceof SquareRefusedError) {
      return json(
        {
          error:
            "Checkout can't open right now. A passkey still unlocks everything.",
        },
        { status: 502 },
      );
    }
    return json(
      { error: "Checkout needs a moment, then it opens." },
      { status: 502 },
    );
  }
}
