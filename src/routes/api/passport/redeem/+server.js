import { json } from "@sveltejs/kit";
import { enforceRateLimit } from "$lib/server/rateLimiter.js";
import { hasSecret, voucherWords } from "$lib/server/env.js";
import * as store from "$lib/server/store.js";
import { issueToken } from "$lib/server/licenseCrypto.js";
import { createVoucherLicense, findLicense } from "$lib/server/licenses.js";

export async function POST(event) {
  const limited = enforceRateLimit(event, { bucket: "redeem", max: 12 });
  if (limited) return limited;

  if (!hasSecret() || !(await store.isWritable())) {
    return json(
      {
        valid: false,
        reason: "Passkeys need server setup before they work here.",
      },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await event.request.json();
  } catch {
    return json(
      { valid: false, reason: "A passkey goes in the box." },
      { status: 400 },
    );
  }
  const input = (body?.code ?? "").toString().trim();
  if (!input) {
    return json(
      { valid: false, reason: "A passkey goes in the box." },
      { status: 400 },
    );
  }

  try {
    const found = await findLicense(input);
    if (found) {
      return json({
        valid: true,
        code: found.code,
        phrase: found.phrase,
        token: issueToken(found.license),
      });
    }

    // Unlock words (friends, press, promos) mint a fresh personal Passport.
    const words = voucherWords();
    if (words.length && words.includes(input.toUpperCase())) {
      const made = await createVoucherLicense();
      return json({
        valid: true,
        code: made.code,
        phrase: made.phrase,
        token: issueToken(made.license),
      });
    }

    return json(
      { valid: false, reason: "That passkey didn't match anything on file." },
      { status: 404 },
    );
  } catch (error) {
    if (error?.code === "VOUCHER_LIMIT") {
      return json({ valid: false, reason: error.message }, { status: 410 });
    }
    console.error("[PassportRedeem] Failed:", error?.message || error);
    return json(
      { valid: false, reason: "The passkey check needs a moment." },
      { status: 500 },
    );
  }
}
