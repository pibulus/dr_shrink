# FABLE AUDIT — 2026-07-05

Branch: `fable-audit-2026-07-05` · full audit-and-fix pass, verified live against
the production build (Playwright, real CSP) — not just a code read.

---

## 🚨 PRODUCTION-BREAKING (fixed — deploy this)

**1. Audio/video compression has never worked in a production build.**
Two independent bugs, stacked, both introduced/exposed by the `2731b38`
self-host commit — and both invisible because of bug #3:

- **COEP blocked the ffmpeg worker.** `Cross-Origin-Embedder-Policy:
require-corp` (hooks.server.js) requires the worker script's _own response_
  to carry a compatible COEP header — but adapter-node serves
  `/_app/immutable/*` via sirv, which bypasses hooks entirely. The worker died
  with `net::ERR_BLOCKED_BY_RESPONSE` and the UI hung on "Shrinking…" forever.
  **Fix:** removed COOP/COEP. The app uses ffmpeg's _single-thread_ core — no
  SharedArrayBuffer, so cross-origin isolation buys nothing here and only
  breaks things. (Note left in hooks.server.js for the future-multithread case.)
- **The vendored `static/wasm/ffmpeg-core.js` was the UMD dist.** The bundled
  worker falls back to `(await import(coreURL)).default`, and UMD has no
  default export → `failed to import ffmpeg-core.js`. **Fix:** vendored the
  **ESM** dist, now pinned via `@ffmpeg/core@0.12.10` devDependency
  (provenance documented in package.json instead of a mystery download).
  Also dropped `toBlobURL` — self-hosted files never needed the CORS
  workaround, and direct same-origin URLs stay inside `script-src 'self'`.
  URLs carry `?v=0.12.10-esm` to bust visitors' caches of the old UMD core.
- Verified live: WAV → mp3 (−95%), valid output per ffprobe, progress events
  flowing, batch-zip including per-file shrink all green.

**2. Silent failure UI.** ffmpeg.wasm rejects with a plain _string_, so
`error = e.message` was `undefined` → the error box never rendered → drops
failed to a blank idle screen with zero feedback. Fixed the catch in
`+page.svelte` to stringify any throwable; added a 30 s timeout race around
`ff.load()` so a blocked engine surfaces as an honest error, never an
eternal spinner.

---

## 🛠 Core-engine hardening (compressService.js)

- **Animated WebP guard** — animated GIFs were refused (good) but animated
  WebPs were silently flattened to frame 1. Now detected via the VP8X
  animation flag and refused with the same friendly line.
- **ffmpeg exit codes checked** — `exec()` resolves with a return code instead
  of throwing; failures used to surface as a baffling readFile error. Now a
  clear "format not supported" message.
- **Keep-original guard for audio/video** — a tightly-encoded input can come
  out _bigger_; now returns the original with "already efficient" (same rule
  images already had).
- **SVG minifier safety** — skips whitespace-collapse when the SVG contains
  `<text>` / `xml:space="preserve"` (rendered whitespace!), re-parses the
  output and hands back the original if it broke or barely helped. Verified:
  text-SVG round-trips byte-identical.
- **EXIF orientation** — decodes via `createImageBitmap(file,
{imageOrientation: "from-image"})` with `<img>` fallback, so phone photos
  land upright everywhere.
- **Alpha protection** — non-JPEG sources no longer offered a JPEG re-encode
  candidate (transparent GIF/BMP would have been flattened onto black).
- **HEIC handled honestly** — was refused as "already compressed" (false).
  Now routed to the image decoder: Safari converts it natively (great), other
  browsers get "export it as JPEG first".
- **PDF refusal message** — was "already compressed" (also false); now an
  honest "not in the kit yet — on the roadmap".
- **Zip entry safety** — batch entries built on a null-prototype object; a
  file literally named `__proto__` used to _silently vanish_ from the zip.
- **Batch progress** — per-file ffmpeg progress now scales into the batch bar
  (audio/video inside a batch used to freeze the progress display).

## 🖱 Drop-flow hardening (+page.svelte)

- **Busy guard** — dropping files mid-job used to run two jobs concurrently
  through one ffmpeg instance (state clobbering, doubled results). Now a
  gentle "hang on — still crunching" quip.
- **Folder drops** — folders arrive as unreadable pseudo-Files and threw a
  cryptic error; the #1 real-world sad path for a "drop anything" app. Now
  expanded recursively via `webkitGetAsEntry` (400-file cap, dotfile junk like
  `.DS_Store` skipped).
- **Expired re-downloads** — the history ↓ button was a silent no-op after
  the 30-min blob TTL; now explains itself and removes the dead button.
- Progress values clamped to 0..1 before hitting CSS.

## ♿ A11y + honesty

- **Modal Escape bug** — `on:keydown|stopPropagation` on the dialog box meant
  Escape _didn't close the modal while focus was inside it_ (e.g. the
  contributor-code input). Fixed; plus focus now moves into the dialog on
  open and returns to the opener on close. Verified live.
- **Supporter gate copy** — supporters over the limit were told to "Support
  the doc" (they already had); `gated` no longer opens the upsell modal for
  them, and the message explains it's a browser-memory ceiling, not a paywall.

## 🧹 Hygiene

- `npm run lint` was **failing wholesale** — ESLint was linting the vendored
  31 MB-adjacent `static/wasm/ffmpeg-core.js` (147 errors). Ignored (prettier
  already did). That noise was masking two real findings: a dead `totalSaved`
  reactive (removed) and the mascot `{@html}` (safe — static app-authored hat
  art; annotated).
- Docs that lied, fixed: README claimed supporter limits of 500 MB/200 files
  (code: 100 MB/25), claimed ffmpeg loads "from unpkg CDN" (self-hosted), and
  the refusal list was stale. ROADMAP updated to match reality (animated WebP,
  HEIC path, folder drops, stale apple-touch-icon item removed).

---

## ✅ Verification (all on the production build)

- `svelte-check` 0 errors · `lint` clean · `vitest` 4/4 · `vite build` clean
- Live Playwright drive: image (−63%), SVG minify (valid, −27%),
  SVG-with-text (byte-identical passthrough), animated GIF (friendly refusal),
  WAV→mp3 (−95%, ffprobe-valid), 4-file batch → zip (all members shrunk,
  archive integrity OK), modal Escape/focus, intro modal, history counts.

## 🤔 Deliberately left alone (with reasons)

- **Mascot engine internals** — subagent-reviewed; no launch blockers. Two
  cosmetic nits noted for a rainy day: a few untracked blink `setTimeout`s
  post-destroy (writes to a persistent singleton store, harmless in this
  single-route app), and the first-load grow effect not replaying on remount.
  The engine was just refactored to be portable; not churning it.
- **gzip on the main thread** — a 100 MB unknown file blocks the UI for a few
  seconds. Real fix is a Worker (already on the ROADMAP as v2); not worth the
  complexity tonight.
- **Payments/contributor codes** — structure only, per README. Not touched.
- **`localStorage` theme flash** — a non-default theme flashes cream for one
  frame on load. Fixing needs an inline script + CSP hash surgery; cosmetic,
  skipped.
- **TIFF in Chrome** — browsers other than Safari can't decode TIFF; the user
  gets the friendly decode error. Listing it as supported is ~true on Safari
  only; left as-is.

## 👀 Look at first

**`src/hooks.server.js` + `static/wasm/ffmpeg-core.js`** — the prod
audio/video fix. After deploying, hard-refresh and drop a `.wav` on
drshrink.app; it should hand back a `.min.mp3` in seconds. That single flow
exercises the whole stack (worker, WASM, CSP, progress, download).
