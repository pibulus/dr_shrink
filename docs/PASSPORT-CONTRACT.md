# Passport build — shared contract (2026-11-01)

Three tracks build in parallel. Each owns the files listed; nobody edits
another track's files or `src/routes/+page.svelte` (the integrator wires that
last). No git commits from tracks — leave the working tree dirty.

## Voice + design laws (apply to every string and surface)

- **Sovereign Voice**: never "you/your/you're" in any user-facing string
  (labels, aria-labels, errors, placeholders, success copy). No questions
  aimed at the person, no imperative bossing ("try again", "make sure").
  State facts and offer actions: "Passport ready", "Fits under 10 MB",
  "Opens Square checkout". First person as the maker is fine ("I made this").
- **No emoji as copy garnish or bullets.** Charm emoji only in footer/support
  chrome (☕ coffee jar, 🐙 GitHub). `✓` list markers are CSS, not emoji.
- **No absolute white/black.** Ink `#1e1714`-ish, paper `#fffdf7` / cream
  gradient, borders warm sepia `#292524`.
- **No red/danger UI.** Soft refusals in warm tones (rose `#c4607a`-energy or
  the app's purple at low alpha).
- Never say "AI" or a model name anywhere.
- The app uses `--ds-*` tokens (see `src/lib/styles/theme-variables.css`):
  `--ds-ink`, `--ds-bg`, `--ds-primary-color` (+`-rgb`), `--ds-accent-color`
  (+`-rgb`), `--app-suffix-gradient`. Brand duo = purple `#9333ea` → pink
  `#f472b6`. Keep gradients inside that duo.

## Soft Neo Toybrut modal skin (TalkType's current look, ported to DS tokens)

```
panel      width min(92vw, 30rem) · padding clamp(1rem,2.6vw,1.5rem) · radius 1.5rem
           border 2px solid #292524 · box-shadow 3px 3px 0 #292524
           background linear-gradient(145deg, #fffcf5, #fff6e6)
           max-height min(84dvh, calc(100dvh - 3.5rem - env(safe-area-inset-bottom)))
backdrop   rgba(43,38,32,0.46) + blur(4px)
motion     in 240ms cubic-bezier(0.34,1.4,0.64,1): translateY(16px) scale(.92) → 0/1
           out 150ms cubic-bezier(0.4,0,0.2,1): → translateY(10px) scale(.92)
           reduced-motion: no animation, instant close
close X    44×44 round, top/right inset clamp(.5rem,1.2vw,.75rem)
           fill var(--ds-accent-color) · 2px solid #1e1714 · shadow 2px 2px 0 #1e1714
           glyph = inline SVG stroke 3.25 round caps (never a typed ×), ink #fffdf7
           hover: scale(1.08) rotate(90deg), shadow 3px 3px 0 · active: scale(.9), shadow 1px 1px 0
           transition transform .22s cubic-bezier(.34,1.56,.64,1)
marker     .ds-marker { background-image: linear-gradient(to top, rgba(var(--ds-primary-color-rgb),.28) 0 38%, transparent 38%); border-radius 2px; padding 0 .08em }
headline   1.55rem/900/line-height 1.15/tracking -0.01em, sm: 1.875rem, ink #1e1714
accent sub .875rem–1rem, 700, color var(--ds-accent-color)
pitch copy .875rem (sm .9375rem) 500, line-height 1.375, #374151-ish warm grey, left-aligned, > * + * margin-top .625rem
✓ list     li flex gap .5rem; li::before content '✓' color var(--ds-accent-color)
primary    min-height 3rem · bg var(--ds-primary-color) · ink #fffdf7 · 900 · radius 1rem
           border 2px solid #1e1714 · shadow 2px 2px 0 #1e1714
           hover translateY(-1px) shadow 3px 3px 0 · active translateY(1px) shadow 1px 1px 0
secondary  min-height 2.75rem · bg #fffdf7 · ink #1e1714 · 900 · same border, no shadow
           variant .is-link: transparent, underline, no border
code input min-height 3.25rem · 2px solid #1e1714 · radius .875rem · bg #fffdf5
           1.05rem 800 centered letter-spacing .04em · focus ring 0 0 0 3px rgba(var(--ds-accent-color-rgb),.22)
section h4 .72rem 900 uppercase letter-spacing .04em #374151 (Options sections)
card       .ds-card: 2px solid #292524 · radius 1.25rem · bg #fffdf5 · padding .9rem · shadow 2px 2px 0 #292524
```

Pitch skeleton (Intro / About / Passport are siblings):
mascot 64–72px centred → headline with marker on the punch word → accent
sub-line → body (pitch copy and/or ✓ list) → primary CTA → quiet secondaries →
tiny footer line.

## Pricing — `src/lib/config/pricing.js` (exists)

`PRICING.currentPrice` (9), `currency` ("AUD"), `productName`, `termDays`
(null = permanent), `amountMinor` (900), `displayPrice` ("A$9"),
`priceLine` ("A$9 once · permanent · no subscription"). Never restate the
number in copy.

## `src/lib/services/supporterService.js` — SERVER track owns; others import

Keep every existing export working (`isSupporter`, `LIMITS`, `limitsFor`,
`limitMB`, `checkDrop`, `SUPPORT_URL`, `daysRemaining`, `setSupporter`).
Add:

```js
export const passportCode   // writable<string>  'DS-XXXX-XXXX-XXXX' | ''
export const passportPhrase // writable<string>  'mossy otter drifts midnight' | ''
export async function startCheckout()
  // POST /api/passport/checkout → stash claim token in sessionStorage →
  // window.location.assign(checkoutUrl). Throws Error(friendly) on failure,
  // e.g. "Checkout needs server setup first. Passkeys still work."
export async function redeemCode(input)
  // accepts 'DS-XXXX-XXXX-XXXX', bare 12-hex, or the 4-word phrase.
  // → { ok: true, code, phrase } | { ok: false, reason }
  // On ok: persists code+phrase+token, sets isSupporter true.
export function unlockUrl()      // 'https://drshrink.app/u/<code>' or ''
export function handleUrlUnlock() // reads ?unlock= / ?code= / #unlock= on load,
  // redeems, strips params; → Promise<{ unlocked: boolean }>
export function forgetPassport() // clears everything (Options "forget")
```

Storage keys: `drshrink-supporter` ('true'), `drshrink-passport-code`,
`drshrink-passport-phrase`, `drshrink-passport-token`. Legacy
`drshrink-supporter-expires` honoured until it lapses.

## `src/lib/services/shrinkPrefs.js` — ENGINE track owns

```js
export const shrinkPrefs // writable<{ format, quality, fitUnder, maxDim, audioOnly, looseBatch }>
  // format:   'webp' | 'jpeg' | 'png' | 'avif'      (default 'webp')
  // quality:  'lean' | 'balanced' | 'crisp'          (default 'balanced')
  // fitUnder: 0 | 8 | 10 | 25   (MB, 0 = off)        (default 0)
  // maxDim:   0 | 3840 | 2560 | 1920 (0 = original)  (default 3840)
  // audioOnly: boolean (video → mp3)                 (default false)
  // looseBatch: boolean (download each file, no zip) (default false)
export const DEFAULT_PREFS
export function setPref(key, value)   // persists to localStorage 'drshrink-shrink-prefs'
export function resetPrefs()
export function effectivePrefs(prefs, isSupporter) // free users always get DEFAULT_PREFS
export const PREF_CHOICES // label tables for the UI, e.g. quality: [{id:'lean',label:'Lean',hint:'smallest'}…]
```

`compress(files, { onProgress, maxBatchBytes, prefs })` — ENGINE adds `prefs`.
With `looseBatch` the batch returns one result per file instead of one zip.
`avif` falls back to webp when `canvas.toBlob('image/avif')` is unsupported.
`fitUnder` binary-searches quality (then dimension) until the output fits;
result `note` says "fits under 10 MB". Audio-only video: `.mp3` out.

## `src/lib/components/ShrinkStyleCard.svelte` — ENGINE track owns

Self-contained Options card: Format · Quality · Fit under · Max size ·
Audio from video · Loose batches. Segmented pills, no sliders. Props:
`locked` (boolean) — when locked, renders the same controls disabled at 55%
opacity with a single "Passport" chip in the title row and dispatches
`unlock` on click anywhere. Skin per the table above.

## Modal + pitch components — SKIN track owns

`Modal.svelte` (generic shell, keeps `open`/`title`/`icon` API + `on:close`,
adds `size: 'sm'|'md'|'lg'`), `IntroModal.svelte`, `AboutModal.svelte`,
`OptionsModal.svelte` (adds `<slot name="shrink-style" />` under a "Shrink
style" section title, and a Passport row/CTA when locked, a "Passport" card
with code/phrase + copy + "Forget passport" link when unlocked),
`PassportModal.svelte` (new; replaces SupporterModal: views pitch / redeem /
unlocked; `source` prop; dispatches `close`), `FooterComponent.svelte`
(third button: "Passport" / "Passport ✓"), `ThemeMascot.svelte` if needed.
Delete `SupporterModal.svelte` once PassportModal is in.

## Server — SERVER track owns

`src/routes/api/passport/checkout/+server.js`,
`src/routes/api/passport/checkout/[checkoutId]/+server.js`,
`src/routes/api/passport/redeem/+server.js`,
`src/routes/api/square/webhook/+server.js`,
`src/lib/server/**` (squareProvider, licenseStore w/ filesystem + memory
adapters, licenseCrypto, rateLimiter, passphrase from the word list in
`tools/generate-codes.mjs`), `src/routes/passport/success/+page.svelte`,
`src/routes/u/[code]/+page.svelte`, `.env.example`, `docs/PASSPORT-SERVER.md`,
`svelte.config.js` (CSP only if required), `src/lib/services/supporterService.js`.
Env: `SQUARE_ENVIRONMENT`, `SQUARE_API_VERSION`, `SQUARE_ACCESS_TOKEN`,
`SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`,
`SQUARE_WEBHOOK_NOTIFICATION_URL`, `PUBLIC_APP_URL`,
`PASSPORT_LICENSE_SECRET`, `DRSHRINK_DATA_DIR` (filesystem store; default
`./data`), optional `RESEND_API_KEY` + `PASSPORT_EMAIL_FROM`.
Never print secrets. Never touch `~/.config/fleet/keys.env`.
