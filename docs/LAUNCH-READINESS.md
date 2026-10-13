# DrShrink launch assessment — 13 October 2026

**The current live version needs these fixes before promotion.** A live browser
reproduced `toBlobURL is not defined` on a WAV upload. The updated local
production build successfully converts audio and video under the real CSP.

**Local verdict: ready for a small free launch with optional Ko-fi tips, after
deploying and checking the live build.** A physical-phone pass and a real tip
remain unverified release checks. The current live version has not been changed.
A paid pass remains future work: copying TalkType's Square checkout alone would
not provide DrShrink's purchase verification, activation, recovery and support.

## Fixes made

- **Audio/video:** load same-origin ESM/WASM directly; clear the startup timer;
  clean virtual files on failed writes/encoding; use safe internal output names;
  encode MP4 as H.264/yuv420p with even dimensions for playback compatibility.
- **File preservation:** no ZIP entry can overwrite another when names collide;
  folder paths survive; batches keep HTML/DOCX in their original formats and
  compress text directly inside the ZIP. Single-file text extraction is explained
  before use. Tiny incompressible files return unchanged.
- **Animated images:** detect GIF frames even without optional control extensions;
  detect animated PNGs; keep the existing animated WebP guard. Refused animations
  remain intact inside batch ZIPs.
- **Readable HTML:** exclude scripts/styles/templates and separate paragraphs.
  SVG whitespace is preserved around text, styles, scripts and foreign objects.
- **Browser storage:** blocked preferences cannot prevent hydration/compression.
  Cache eviction scans keys instead of cloning every cached file, stores Blobs
  without another full buffer copy, and reads older buffer entries compatibly.
  Clear Recent removes cached files as well as stats, waits for pending writes,
  and releases session results. Retained session results have a 100 MB target
  and a 25-entry cap (the newest result is always retained).
- **Usability:** focus stays inside each dialog; Escape closes Intro/About even
  with a control focused; focus returns to the opener. Close, toggle, clear and
  download controls have at least 44 px targets. Errors are announced. Laptop
  and short-phone spacing keeps the drop target above the fixed footer.
- **Honest promises:** explain local cache/history and the visit counter; remove
  the unsupported offline claim and nonfunctional $9/year offer. File limits
  give practical guidance without a purchase prompt.
- **Income:** Support and a quiet link after a successful shrink point to the
  existing `https://ko-fi.com/madebypablo`. Tips are optional, choose-your-amount,
  and do not promise activation or higher limits. No automatic popup after use.
- **Dependencies:** apply compatible audit patches without forced major upgrades;
  add missing Node types and resolve the CSS compatibility warnings.

## Verification

- `npm run check`: zero errors and zero warnings.
- `npm test`: 13 passing tests, including byte preservation, ZIP collisions,
  folder paths, animation refusal, audio startup timeout/retry and cleanup.
- `npm run lint` and `git diff --check`: pass.
- Node production build: pass. Netlify production build: pass (generated render function and static assets).
- Chromium with production CSP: real PNG→WebP, SVG, HTML→text, DOCX→text,
  gzip byte round-trip, tiny-file passthrough, repeated WAV→MP3, AVI→MP4,
  5-file ZIP integrity/document preservation/collisions, PDF refusal, limit
  guidance, history re-download after refresh, saved theme, cache clearing,
  and compression with both localStorage and IndexedDB blocked.
- Runtime diagnostics: no page errors or CSP violations in the local Chromium
  pass. The only non-GET network request was the site visit counter; no file
  upload occurred in the exercised flows.
- `ffprobe`: output is valid MP3 (2 seconds) and H.264/yuv420p MP4 (160×120,
  1 second).
- WebKit at 375×812: gzip round-trip and real WASM audio conversion pass without
  runtime errors. This is browser-engine evidence, not an actual iPhone test.
- Chromium layouts at 1280×800, 1024×768, 768×768, 1366×690, 320×568,
  375×667, 375×812 and 390×812: the complete drop target stays above the fixed
  footer. Mobile checks have no horizontal overflow and Support fits.

Local browser scripts, downloads, screenshots, logs and audit JSON are in
`.playwright-mcp/launch-audit/` (ignored by Git). The smoke scripts use the
existing Playwright installation in the neighbouring TalkType checkout.

## Remaining release checks and limits

1. **Deploy and verify the new live build.** This assessment changes local files;
   it does not deploy or claim the current production site contains the fixes.
   Repeat an image, WAV and ZIP download on the live origin, checking CSP.
2. **One actual Ko-fi tip.** The external page presents an anti-bot challenge to
   automated requests; neither receipt, recipient identity nor settled payment
   has been verified. Confirm the linked page belongs to Pablo and complete a
   small human payment before treating income as proven. No payment was made.
3. **Physical iPhone/Safari and Android:** picker/drop where available, download
   naming, playback and memory behavior. Automated mobile viewport/WebKit tests
   do not prove device behavior, especially around WASM memory.
4. **Deliberate reach limits:** no PDF shrink; HEIC/TIFF depend on browser decoders;
   no service worker/offline loading. Single HTML/DOCX extraction removes
   formatting and images. Canvas/media encoding can reduce quality. Browser
   compression and ZIP creation can still block the main thread on larger jobs;
   a worker/cancellation UI would be a separate improvement. Chrome limited
   automatic downloads during the long smoke sequence; the ZIP completed and
   the explicit Download button worked. The auto-download toggle and manual
   download path were verified, rather than bypassing that browser limit.
5. **Audit remainder:** `npm audit --omit=dev` reports three moderate findings
   (`sprintf-js`, `argparse`, `mammoth`) from Mammoth's command-line argument
   parser. The app imports `mammoth/lib/index.js` for browser extraction; that
   path does not import `argparse`. This is an assessed, bounded exposure, not a
   zero-vulnerability claim. Full audit: 22 findings (2 critical, 6 high,
   10 moderate, 4 low). The critical findings are in the Vitest test/UI toolchain;
   this app uses `vitest run` and does not deploy that UI. The low cookie finding
   reaches SvelteKit even though it is declared as a development dependency;
   this app sets no application cookies. Forced Tailwind/SvelteKit/Vitest major
   migrations were outside this pass.
6. **Local cache is a convenience, not a backup.** Only the last ten outputs are
   cached, quota can reject writes, and expired files are cleaned on later
   writes. Recent filenames/stats persist until cleared. Original source files
   remain on the user's device.
