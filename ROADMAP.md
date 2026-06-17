# DrShrink — Roadmap 🧠

A living list of where DrShrink *could* go. Not commitments, not dates — candidates
grouped by theme, honest about effort. Edit aggressively. The north star stays:
**drop anything → get something smaller and useful, no settings, all in your browser.**

---

## ✅ v1 (shipped, live at drshrink.app)
- Drag/drop or click → compress, single + batch
- Images → WebP (quality-tuned for *utility*: q0.86, full-res to 3840px, skips
  pointless re-encodes, refuses animated GIFs)
- Batch → one `.zip` (shrinks each shrinkable file first)
- Text/code → gzip · `.html` → plain text · `.docx` → text (lazy mammoth)
- Audio → mp3 (lazy ffmpeg.wasm)
- Already-compressed detection (politely refuses)
- 4 themes, mascot recolours with theme, fused drop-zone progress + toast
- History (localStorage, stats-only), gentle Web Audio sounds + mute
- About / Options / Unlock modals, supporter stub + contributor-code input
- SoftStack parity (cream bg, dark-ink title, big mascot), responsive, SEO/OG/PWA
- Deployed on the Pi via cloudflared → drshrink.app

---

## 🎯 v2 candidates

### Compression reach (the core promise — "anything")
- **PDF shrink** — downscale/re-encode embedded images via pdf-lib + the existing
  Canvas path. Big win for scanned docs; honest caveat: only helps image-heavy PDFs.
  *(medium; lazy-load pdf-lib; run in a Worker for big files)*
- **Video** — short clips via ffmpeg.wasm (already loaded for audio). Slow + memory-
  capped in-browser; ship as "experimental, short clips only" behind a size guard.
  *(medium-hard, fragile — the one to resist over-scoping)*
- **HEIC → JPEG/WebP** — iPhone photos. Needs a decoder (heic2any or similar, lazy).
  *(medium; genuinely useful for the Apple crowd)*
- **Better image encoders** — optional MozJPEG/AVIF via @jsquash for max quality-per-byte
  on photos, when the native Canvas WebP isn't enough. *(medium; lazy)*
- **SVG minify** — run dropped `.svg` through a tiny optimizer instead of gzip. *(small)*

### Monetization (turn the stub into real)
- **Real checkout** — wire LemonSqueezy / Stripe / Polar for the $9/yr. The gating
  structure + limits already exist; just needs the payment + a license/code issuer.
- **Issue real contributor codes** — replace the placeholder VALID_CODES set with
  actual generated/redeemable codes (for gifts + multi-device). *(small once checkout exists)*
- **Make the value line "more control," not just "bigger numbers."** Thin perk =
  size+batch. Richer contributor perks that fit DrShrink:
  - **Batch output organization** — name patterns, subfolders in the zip, "keep
    originals + minified side by side"
  - **Format choice** — the one settings-escape-hatch, gated: "give me JPEG not WebP",
    "keep PNG transparency", target "smaller" vs "keep quality"
  - **History export** (CSV of what you shrank) + re-download
  - **Priority/new formats** — PDF, video, HEIC land supporter-first
  - Decide the final mix before charging.

### Workers & performance (mobile resilience)
- **Compress in a Web Worker** — move Canvas/ffmpeg off the main thread so the UI
  (and mascot) never freezes on big files. *(medium; biggest perceived-perf win)*
- **Stream/iterate batches** — process + free files one at a time instead of holding
  all bytes at once (current batch path could OOM a phone on a huge supporter batch).
  *(small-medium; matters only past the free cap)*

### Polish & delight
- **Output preview** — show a tiny before/after thumbnail + the saved % per result,
  so "utility" is *visible*, not just a number.
- **Re-download from history** — optionally keep result blobs in-session so the
  history list's items are clickable again (until reload). *(small)*
- **PWA install + offline** — proper service worker so it works offline and installs
  as an app (the mascot icon's already wired). *(small-medium)*
- **Drag-over flourish** — mascot reacts when you drag a file over the zone (eyes
  widen / leans in) before you even drop. *(small, pure joy)*
- **"Shrink again"** — re-run with a different target (e.g. "smaller" vs "keep quality")
  if someone wants the one knob. *(small; weigh against no-settings ethos)*

### Housekeeping
- Tidy the apple-touch-icon 404 (cosmetic).
- Real-device pass on an actual iPhone + Android (Playwright ≠ Safari).
- Lighthouse run for a hard perf/a11y number.

---

## ✋ Deliberately NOT doing
- Server-side compression / accounts / file storage — it's all client-side, private,
  no uploads. That's the whole point.
- A settings panel full of codecs and sliders — one good default per type stays the rule.
- Scaling. Can't-scale is the feature.

---
_Part of the drag-into-mascot family. See `apps/_ideas/` for the sibling apps + the
shared-kit notes._
