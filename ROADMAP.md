# DrShrink — Roadmap 🧠

A living list of where DrShrink _could_ go. Not commitments, not dates — candidates
grouped by theme, honest about effort. Edit aggressively. The north star stays:
**drop anything → get something smaller and useful, no settings, all in your browser.**

---

## ✅ v1 (shipped, live at drshrink.app)

- Drag/drop or click → compress, single + batch
- **Drop onto the mascot** — drag files over the brain (glow + scale up, catch animation)
- **Images** → WebP q0.86 + re-encode candidate, 4K cap, skips pointless re-encodes,
  refuses animated GIFs, supports JPEG/PNG/WebP/BMP/GIF/TIFF
- **SVG** → minified in-place (strips comments/whitespace/cruft → `.min.svg`)
- **Video** → H.264 mp4 via ffmpeg.wasm (CRF 28, ultrafast preset, AAC 128k audio)
- **Audio** → VBR mp3 via ffmpeg.wasm (q5, ~128kbps) — MP3/WAV/M4A/AAC/OGG/FLAC/AIFF
- **Text/code** → gzip level 9, `.html` → plain text, `.docx` → text (mammoth)
- **Batch** → one `.zip` (each shrinkable file compressed first, audio/video included)
- Batch OOM guard (300MB total input cap)
- Already-compressed detection (politely refuses zip/gz/7z/rar/pdf/heic)
- **Blob cache** — IndexedDB 30min TTL, results survive refresh, history re-downloadable
- **Auto-download** on completion (toggle in options, default on)
- Results list capped at 25 entries
- 4 themes, mascot recolours with theme, canonical brain SVG in all modals
- Fused drop-zone progress + toast, squeeze/pop mascot animations, glow pulse
- Rhythmic mascot pulse during processing, confetti burst on big wins
- History (localStorage, stats only) + re-download button per entry
- Gentle Web Audio sounds + mute toggle
- About / Options / Support modals, contributor code system
- Tickle easter egg (rapid-click the doctor)
- SoftStack parity (cream bg, dark-ink title, big mascot), responsive, SEO/OG/PWA
- Deployed on the Pi via cloudflared → drshrink.app
- Memory hardening: ffmpeg vfs leak fixed, IndexedDB error handlers, gradient RAF cleanup

---

## 🎯 v2 candidates

### Compression reach

- **PDF shrink** — downscale/re-encode embedded images via pdf-lib + the existing
  Canvas path. Big win for scanned docs; honest caveat: only helps image-heavy PDFs.
  _(medium; lazy-load pdf-lib)_
- **HEIC → JPEG/WebP** — iPhone photos. Needs a decoder (heic2any or similar, lazy).
  _(medium; genuinely useful for the Apple crowd)_
- **Better image encoders** — optional MozJPEG/AVIF via @jsquash for max quality-per-byte
  on photos, when the native Canvas WebP isn't enough. _(medium; lazy)_
- **Animated GIF → animated WebP** — currently refused to avoid flattening; convert
  instead. _(small-medium; ffmpeg.wasm already loaded)_
- **XLSX / PPTX text extraction** — like DOCX but for spreadsheets and slides.
  _(small; similar zip+XML approach)_

### Monetization (turn the stub into real)

- **Real checkout** — wire LemonSqueezy / Stripe / Polar for the $9/yr. The gating
  structure + limits already exist; just needs the payment + a license/code issuer.
- **Contributor perks** — beyond just bigger limits:
  - **Format choice** — "give me JPEG not WebP", "keep PNG transparency"
  - **Quality target** — "smaller" vs "keep quality" (two presets, not a slider)
  - **Batch output organization** — subfolders in the zip, naming patterns
  - **History export** (CSV) + extended cache TTL
  - **Priority access** to PDF, HEIC when they land
- **Issue real contributor codes** — generated/redeemable codes for gifts + multi-device.
  _(small once checkout exists)_

### Workers & performance

- **Compress in a Web Worker** — move Canvas/ffmpeg off the main thread so the UI
  (and mascot) never freezes on big files. _(medium; biggest perceived-perf win)_
- **Stream/iterate batches** — process + free files one at a time instead of holding
  all bytes at once. _(small-medium; matters only past the free cap)_

### Polish & delight

- **Output preview** — show a tiny before/after thumbnail per result.
- **PWA install + offline** — proper service worker so it works offline and installs
  as an app (the mascot icon's already wired). _(small-medium)_
- **"Shrink again"** — re-run with a different target if someone wants the one knob.
  _(small; weigh against no-settings ethos)_
- **Drag-from-desktop-to-mascot outside the page** — if technically possible.
  _(tiny, joy)_

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
