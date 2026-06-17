# DrShrink 🧠

**Drop a file in, get a smaller one out.** No settings, no uploads, 100% in your browser.

DrShrink shrinks things the 80/20 way — one good default per file type, zero knobs:

| Drop this | Get this |
| --- | --- |
| image (jpg/png/webp…) | re-encoded WebP (much smaller) |
| multiple files | a single `.zip` (each shrinkable file shrunk first) |
| text / code / json / svg / md | gzipped `.gz` |
| `.html` | stripped to plain text |
| `.docx` | plain text (`.txt`) |
| audio (mp3/wav/m4a) | smaller mp3 |
| already-compressed (zip/mp4/pdf…) | politely refused — nothing to do |

Everything runs client-side. Files never leave your device.

## Stack
SvelteKit · Svelte 5 · Tailwind + DaisyUI · `@sveltejs/adapter-node`.
Compression: native Canvas (images), [`fflate`](https://github.com/101arrowz/fflate)
(zip/gzip, eager), [`mammoth`](https://github.com/mwilliamson/mammoth.js) (docx, lazy),
[`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) (audio, lazy).
Living mascot via the [softstack-mascot](https://github.com/pibulus/softstack-mascot) kit.

## Dev
```bash
npm install
npm run dev      # http://localhost:3002
npm run build    # production build (adapter-node → ./build)
npm run check    # svelte-check
npm run lint     # prettier + eslint
```

## Themes
Four themes (vibrant / warm / cool / minimal) via `html[data-theme]` + `--ds-*` CSS
vars; the mascot recolors with the theme. See `src/lib/styles/theme-variables.css`.

## Supporter
`$9/yr` stub: `src/lib/services/supporterService.js` gates file size + batch limits
(structure only — no real payment wired yet).

## Deploy
Self-hosted on a Raspberry Pi via the `pibulus-os` `deploy_app.sh` node-build pattern
(systemd service + cloudflared). Target domain: **drshrink.app**.

---
Part of the drag-into-mascot micro-app family (DrShrink · metaflush · cryptkeep · iconmakeit).
Built with the SoftStack philosophy: one thing, done well, runs locally, sparks joy.
