import { json } from "@sveltejs/kit";
import { isWebhookConfigured, squareConfig } from "$lib/server/env.js";
import { extractPayment, verifyWebhookSignature } from "$lib/server/square.js";
import {
  createLicenseForCheckout,
  getCheckoutByOrderId,
  markPaid,
} from "$lib/server/licenses.js";

export async function POST(event) {
  if (!isWebhookConfigured()) {
    console.error("[SquareWebhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return json(
      { error: "Square webhook is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await event.request.text();
  const signature =
    event.request.headers.get("x-square-hmacsha256-signature") || "";
  const notificationUrl =
    squareConfig().notificationUrl ||
    `${event.url.origin}${event.url.pathname}`;

  if (!verifyWebhookSignature({ rawBody, signature, notificationUrl })) {
    console.warn("[SquareWebhook] Invalid signature");
    return json({ error: "Invalid signature." }, { status: 403 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }

  const payment = extractPayment(payload);
  if (!payment || payment.status !== "COMPLETED") {
    return json({ received: true, ignored: true });
  }

  try {
    const checkout = await getCheckoutByOrderId(payment.order_id);
    if (!checkout) {
      console.warn(
        "[SquareWebhook] Payment did not match a DrShrink checkout:",
        payment.order_id,
      );
      return json({ received: true, ignored: true });
    }
    const paid = await markPaid(payment.order_id, payment);
    if (paid) await createLicenseForCheckout(paid);
  } catch (error) {
    // A completed payment we could not persist: 500 on purpose so Square
    // retries until the store is writable again.
    console.error(
      `[SquareWebhook] Failed to process paid order ${payment.order_id}:`,
      error?.message || error,
    );
    return json(
      { error: "Payment processing failed. Retry expected." },
      { status: 500 },
    );
  }
  return json({ received: true });
}
