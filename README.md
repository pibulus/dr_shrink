# DrShrink 🧠

**Drop a file in, get a smaller one out.** No settings, no uploads, 100% in your browser.

DrShrink is a little brain dude that catches your files, squishes them down, and hands back something smaller and more useful. One good default per file type, zero knobs. Drop anything — the doctor figures out what to do.

| Drop this                             | Get this                                        |
| ------------------------------------- | ----------------------------------------------- |
| Images (jpg/png/webp/bmp/gif/tiff)    | WebP at q0.86, 4K cap — or kept if already tiny |
| SVG                                   | Minified in-place (stripped cruft) → `.min.svg` |
| Video (mp4/mov/webm/mkv/avi)          | H.264 mp4, CRF 28, ultrafast                    |
| Audio (mp3/wav/m4a/aac/ogg/flac/aiff) | VBR mp3, ~128kbps                               |
| Text/code/json/csv/svg/xml/yaml/md    | Gzipped `.gz`                                   |
| HTML                                  | Stripped to plain text                          |
| DOCX                                  | Extracted text (`.txt`)                         |
| A folder                              | Expanded into its files (dotfile junk skipped)  |
| Multiple files                        | One `.zip` — each file shrunk first             |
| Anything else                         | Gzip fallback                                   |

Animated GIFs/WebPs are left intact (flattening them would be malpractice).
Archives (zip/gz/7z/rar) get politely refused; PDF is refused with a roadmap
nod; HEIC is attempted — Safari decodes it natively, other browsers get a
friendly "export as JPEG first".

**Everything runs client-side.** Files never leave your device. No accounts, no tracking, no servers.

## Vibe

The mascot catches your files mid-air — glows and scales up when you drag over, squishes flat while crunching, then spring-bounces back harder the more it saved. Results stick around for 30 minutes (IndexedDB) so you can re-download from history. Auto-download on by default. Tickle the doctor if you want.

Four themes (vibrant / warm / cool / minimal), Web Audio blips, confetti on big wins. The brain shows up everywhere — favicon, PWA icons, modals, theme pickers.

## Stack

SvelteKit · Svelte 5 · Tailwind + DaisyUI · `@sveltejs/adapter-node`.
Compression: native Canvas (images), [`fflate`](https://github.com/101arrowz/fflate) (zip/gzip, eager), [`mammoth`](https://github.com/mwilliamson/mammoth.js) (docx, lazy), [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) (audio/video, lazy ~31MB WASM **self-hosted** from `static/wasm/`, single-thread core — keeps everything first-party, no cross-origin isolation headers needed; see the note in `src/hooks.server.js`). Living mascot engine in `src/lib/components/mascot/`.

## Dev

```bash
npm install
npm run dev      # http://localhost:3002
npm run build    # production build (adapter-node → ./build)
npm run check    # svelte-check
npm run lint     # prettier + eslint
```

## Themes

Four themes (vibrant / warm / cool / minimal) via `html[data-theme]` + `--ds-*` CSS custom properties. The mascot recolors with the theme. See `src/lib/styles/theme-variables.css`.

## Supporter

`$9/yr` stub: `src/lib/services/supporterService.js` gates file size + batch limits (structure only — no real payment wired yet). Contributor codes gated to dev mode only.

Free: 25 MB/file, 5 files/batch. Supporter: 100 MB/file, 25 files/batch
(browser-memory-realistic — see `LIMITS` in `supporterService.js`).

## Deploy

Self-hosted on a Raspberry Pi via the `pibulus-os` `deploy_app.sh` node-build pattern (systemd service + cloudflared). Target domain: **drshrink.app**.

---

Part of the drag-into-mascot micro-app family (DrShrink · TalkType · ZipList · CryptKeep). Built with the SoftStack philosophy: one thing, done well, runs locally, sparks joy.
