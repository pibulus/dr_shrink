# DrShrink launch assessment — 13 October 2026

**Verdict: SHIP the free app.** The fixes are deployed at **drshrink.app** and
verified against that origin. The original live version failed WAV uploads with
`toBlobURL is not defined`; the deployed version converts audio/video under the
production CSP and recovers from failed jobs without a reload.

Optional Ko-fi tipping is integrated, but its recipient/payout setup and a real
settled payment remain unverified. Pablo reports the app works on his phone;
the updated release has Chromium and WebKit coverage, not a new physical-device
test performed by this audit.
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
- **Hosting:** identify the actual home-server origin, deploy with a staged smoke
  check and backup, and correct the visitor-counter label to `drshrink.app`.

## Deployment

The custom domain uses the home server's `drshrink` service on port 9017 through
Cloudflare. Its `.pibulus-meta` confirms the deployed source commit. The first
release was `635b793d330b961789d69f69d174a73eec4b3896`, deployed at
2026-10-13T19:45:53+11:00. The final deployed app commit is
`a390015bbfe80305e26019c8ae3a90fd2826075e`, confirmed at
2026-10-13T19:49:45+11:00, including the counter-label correction.
Backups are retained in `/home/pibulus/backups/apps/drshrink-*`.

The separate Netlify preview at
`https://6acdedf2d7b60c917ba63f07--drshrink-netlify.netlify.app` also passed the
browser and stress suites. A Netlify publication alone would not update
`drshrink.app`; no domain or tunnel changes were needed.

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
- The 31-check browser suite passed locally, on the Netlify preview, and on
  `https://drshrink.app`, including actual image, WAV, MP4 and ZIP downloads.
- Runtime diagnostics: no page errors or CSP violations. Non-GET requests on
  the custom domain were the Fleetcount visit counter and Cloudflare's injected
  performance beacon (`/cdn-cgi/rum`); no file upload occurred in tested flows.
- `ffprobe`: output is valid MP3 (2 seconds) and H.264/yuv420p MP4 (160×120,
  1 second).
- WebKit at 375×812: gzip round-trip and real WASM audio conversion pass without
  runtime errors. This is browser-engine evidence, not an actual iPhone test.
- Chromium layouts at 1280×800, 1024×768, 768×768, 1366×690, 320×568,
  375×667, 375×812 and 390×812: the complete drop target stays above the fixed
  footer. Mobile checks have no horizontal overflow and Support fits.
- The 11-case stress suite passed locally, on the Netlify preview, and live:
  malformed audio followed by valid audio; failed-media preservation in a batch;
  a second drop while processing; interrupted engine download and retry; folder
  paths with duplicate basenames; unreadable folders; 401-file refusal without
  truncation; file-size refusal; corrupt saved history; repeated jobs, eviction
  and stale download errors; clearing history after pending cache writes.
- After the final deployment, fresh Chromium and WebKit mobile sessions passed
  gzip byte round-trips and WAV→MP3 downloads again, with no runtime/console
  errors. The visit counter accepted `site=drshrink.app` (HTTP 204).
- Live share image: valid 1200×630 PNG. App manifest: served successfully.

Local browser scripts, downloads, screenshots, logs and audit JSON are in
`.playwright-mcp/launch-audit/` (ignored by Git). The smoke scripts use the
existing Playwright installation in the neighbouring TalkType checkout.

## Remaining external checks and known limits

1. **One actual Ko-fi tip.** The external page presents an anti-bot challenge to
   automated requests; neither receipt, recipient identity nor settled payment
   has been verified. Confirm the linked page belongs to Pablo and complete a
   small human payment before treating income as proven. No payment was made.
2. **Physical iPhone/Safari and Android:** picker/drop where available, download
   naming, playback and memory behavior. Automated mobile viewport/WebKit tests
   do not prove device behavior, especially around WASM memory.
3. **Deliberate reach limits:** no PDF shrink; HEIC/TIFF depend on browser decoders;
   no service worker/offline loading. Single HTML/DOCX extraction removes
   formatting and images. Canvas/media encoding can reduce quality. Browser
   compression and ZIP creation can still block the main thread on larger jobs;
   a worker/cancellation UI would be a separate improvement. Chrome limited
   automatic downloads during the long smoke sequence; the ZIP completed and
   the explicit Download button worked. The auto-download toggle and manual
   download path were verified, rather than bypassing that browser limit.
4. **Audit remainder:** `npm audit --omit=dev` reports three moderate findings
   (`sprintf-js`, `argparse`, `mammoth`) from Mammoth's command-line argument
   parser. The app imports `mammoth/lib/index.js` for browser extraction; that
   path does not import `argparse`. This is an assessed, bounded exposure, not a
   zero-vulnerability claim. Full audit: 22 findings (2 critical, 6 high,
   10 moderate, 4 low). The critical findings are in the Vitest test/UI toolchain;
   this app uses `vitest run` and does not deploy that UI. The low cookie finding
   reaches SvelteKit even though it is declared as a development dependency;
   this app sets no application cookies. Forced Tailwind/SvelteKit/Vitest major
   migrations were outside this pass.
5. **Local cache is a convenience, not a backup.** Only the last ten outputs are
   cached, quota can reject writes, and expired files are cleaned on later
   writes. Recent filenames/stats persist until cleared. Original source files
   remain on the user's device.
