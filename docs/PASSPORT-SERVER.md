# Passport server — how the money path works

> Ported from TalkType's Square flow 2026-11-01, trimmed to a **permanent**
> unlock: no term, no renewal, no vault. Everything the Passport unlocks still
> runs in the browser; the server only sells and remembers codes.

## Moving parts

| Piece                                                                           | File                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Env reader (reports `configured`, never values)                                 | `src/lib/server/env.js`                                     |
| KV store: JSON file per key, atomic rename, per-key lock; memory twin for tests | `src/lib/server/store.js`                                   |
| Codes · passkeys · tokens                                                       | `src/lib/server/licenseCrypto.js` (+ `words.js`)            |
| Checkouts and licenses                                                          | `src/lib/server/licenses.js`                                |
| Square payment link + webhook HMAC                                              | `src/lib/server/square.js`                                  |
| Rate limiter (in-memory, per bucket)                                            | `src/lib/server/rateLimiter.js`                             |
| `POST /api/passport/checkout`                                                   | creates the Square link, stores a pending checkout          |
| `GET /api/passport/checkout/[id]`                                               | success-page poll; needs header `x-drshrink-checkout-claim` |
| `POST /api/square/webhook`                                                      | verifies signature, marks paid, mints the license           |
| `POST /api/passport/redeem`                                                     | DS code · bare hex · four words · unlock word               |
| `/passport/success`                                                             | polls, stores, shows code + words, copy / email             |
| `/u/<code>`                                                                     | one-tap unlock → `/?unlock=<code>`                          |
| Client                                                                          | `src/lib/services/supporterService.js`                      |

## The flow

1. Pitch CTA → `startCheckout()` → `POST /api/passport/checkout` → `{ checkoutId, claimToken, checkoutUrl }`. Claim token goes to `sessionStorage`; the tab navigates to Square.
2. Square redirects to `/passport/success?checkout_id=…`. The page polls every 2.5 s (×24) with the claim header. Pending until the webhook lands.
3. Square posts `payment.updated` to `/api/square/webhook`. Signature = HMAC-SHA256(key, notificationUrl + rawBody). On `COMPLETED`: `markPaid` → `createLicenseForCheckout` (idempotent — the poll can race it safely). A persist failure returns 500 so Square retries.
4. Poll returns `{ status:'paid', code, phrase, token }`. Client stores all three; `isSupporter` flips.

Codes: `DS-XXXX-XXXX-XXXX` = first 12 hex of HMAC(secret, `drshrink-license:<checkoutId>`).
Passkey: four words from sha256(`drshrink-passkey:<code>`) over `words.js` (308 words; never reorder). The store keeps `phrase:<hash> → codeHash` so the words redeem.
Token: HS256 JWT `{ sub, tier:'passport', source, v:1, iat }` — **no `exp`**.

## Setting it up on the box

1. Add to `~/.config/fleet/keys.env` under `DRSHRINK_EXTRA_ENV`: every var in `.env.example` with a value (sandbox first).
2. `keys-sync drshrink` → `key-doctor`. Restart the `drshrink` service.
3. `sudo mkdir -p /var/lib/drshrink && sudo chown <service-user> /var/lib/drshrink` (or whatever `DRSHRINK_DATA_DIR` says). It must survive deploys.
4. In the Square developer dashboard: webhook subscription → `https://drshrink.app/api/square/webhook`, event `payment.updated`, API version `2026-01-22`. Paste the signature key into env. The subscription URL and `SQUARE_WEBHOOK_NOTIFICATION_URL` must match byte for byte.
5. Square catalog needs nothing — `quick_pay` names the item from `PRICING.productName` and charges `PRICING.amountMinor` in the location's currency.

### Verify (not "sync said green")

```bash
# configured? expect a sandbox checkout URL, not a 503
curl -s -X POST https://drshrink.app/api/passport/checkout -H 'content-type: application/json' -d '{}'
# full click-through: pay with sandbox card 4111 1111 1111 1111, any future date, any CVV
# success page shows DS code + four words; then on a second device:
curl -s -X POST https://drshrink.app/api/passport/redeem -H 'content-type: application/json' -d '{"code":"<four words>"}'
```

A local end-to-end without Square (seeded checkout + signed webhook + claim
poll + redeem by phrase/hex/voucher) was run 2026-11-01 and passes; the
recipe is in the session notes — `PASSPORT_LICENSE_SECRET`,
`SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_NOTIFICATION_URL`,
`SUPPORTER_UNLOCK_CODES=MAESTRO`, `DRSHRINK_DATA_DIR=/tmp/x`, then write
`checkout_<id>.json` + `order_<orderId>.json` the way the route would and POST
a body signed with the key.

## Gotchas carried over from TalkType

- **Sandbox vs production Location ID** — copied from the wrong dashboard page twice before. Always `GET /v2/locations` with the token in hand.
- A Square seller charges in its location's currency; the provider asks the location rather than trusting `PRICING.currency` and warns on mismatch.
- The success page poll has its own rate bucket (90/min) — a paying visitor must never see a 429.
- Netlify fallback: no writable filesystem → checkout and redeem answer 503 ("needs server setup"). Shrinking still works. If the Netlify lane ever has to sell, swap `store.js` for Netlify Blobs; the interface is `get/set/del/update`.
- Rotating `PASSPORT_LICENSE_SECRET` orphans every issued code. Back it up with the other keys.

## Open

- No receipt email with the code yet (Square sends its own receipt; the success page offers copy + mailto). Resend hook is a small add if support mail starts arriving.
- Voucher words are a shared counter, not per-word — fine at 25.
