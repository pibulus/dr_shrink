# DrShrink Passport — plan

> Written 2026-11-01 after the hero-parity + free-limits pass. A tiny tidy
> money-maker: one payment, permanent unlock, zero marginal cost. Everything
> below the checkout runs in the visitor's browser, so a Passport never costs
> us a cent to honour.

## 1. What DrShrink does today (capability audit)

| Area | Shipped | Notes / gaps |
|---|---|---|
| Images | JPEG/PNG/WebP/BMP/GIF/TIFF → WebP q0.86, 4K cap, EXIF-upright, skips pointless re-encodes, refuses animated | One format, one quality. HEIC only on Safari. No AVIF. No target size. |
| SVG | minified in place | — |
| Video | H.264 mp4 CRF 28 ultrafast, AAC 128k (ffmpeg.wasm, 31 MB lazy) | One preset. No resolution step-down, no "audio only". Main thread. |
| Audio | mp3 VBR q5 (~128k) | One preset. |
| Text / code | gzip L9; HTML → text; DOCX → text (mammoth) | XLSX/PPTX not handled. |
| PDF | refused with a roadmap nod | The single most-asked "make this fit the email" case. |
| Batch | zip; images/media shrunk first; doc formats + folder paths kept; folder drops expanded | Always a zip — no "download each file" option. |
| Limits | **free 200 MB/file · 40 files · 300 MB per batch** (raised this pass from 25 MB / 5) | Passport 500 MB · 200 · 600 MB. Ceilings are memory, not commerce. |
| Memory | results cached 30 min (IndexedDB, last 10); stats history in localStorage | Short. No export. |
| Delight | 4 vibes, sounds, squeeze/pop, confetti, tickle, drop-on-mascot | — |
| Platform | PWA installable, not offline; static app, **zero server routes, zero secrets**; box (adapter-node) + Netlify fallback | Adding a server is the one architectural fork — see §4. |
| Money | Ko-fi tips only; dormant `DS-` code redeem (SHA-256 whitelist, now permanent) | No checkout. |

## 2. The pitch — what the Passport unlocks

Free stays the whole product: drop anything, get the one right answer, generous
limits. The Passport sells **choice and reach**, never permission. Everything is
client-side; nothing here needs an account or a server to keep working.

### Ship with v1 of the Passport (all cheap, all in the existing engine)
1. **Output format** — WebP (default) · JPEG · PNG (keeps transparency) · AVIF where the browser can encode it. One segmented control, visible only when unlocked.
2. **Three quality presets** — Lean · Balanced (today's default) · Crisp. Presets, never a slider. Applies to images, audio bitrate (96/128/192), video CRF (30/28/24).
3. **Fit under a size** — "under 10 MB" / "under 25 MB" / "under 8 MB". Binary-search quality then dimension until it fits. This is the job-to-be-done ("Discord/email won't take it") and the line that sells it.
4. **Size cap** — original · 4K · 2K · 1080p. Phone photos to 2K is the everyday win.
5. **Audio out of video** — drop an .mp4, get an .mp3. Three lines of ffmpeg flags.
6. **Loose batches** — download each result separately instead of one zip.
7. **Longer memory** — cache 24 h instead of 30 min, 50 results instead of 10, history export (CSV).
8. **Bigger ceilings** — 500 MB per file, 200 files per drop, 600 MB per batch.
9. **A Passport vibe + holo card** — one extra theme (the family tradition, cf. TalkType's Rainbow) and the `MembershipCard` from TalkType with the brain on it. The card IS the receipt.

### Second wave (each is its own small project; Passport holders get them first)
- **PDF shrink** — pdf-lib + the existing Canvas path on embedded images. Medium.
- **HEIC everywhere** — libheif wasm, lazy. Medium.
- **Animated GIF → animated WebP** — ffmpeg already loaded. Small.
- **Web Worker engine** — the mascot stops freezing on big files. Medium; a free-tier win too.

### Options modal shape (free vs Passport)
Free: Vibe · Sounds · Auto-download · History clear · one quiet
"+ DrShrink Passport" row (TalkType's pattern). Passport: the same plus a
"Shrink style" card — Format / Quality / Fit under / Max size — and the
Passport card itself with "Deal the passkey" copy. No slider anywhere.

## 3. Price

**A$9, once.** (~US$6.) Sits between the $5 and $10 Pablo floated, reads as an
impulse buy next to a free tool that already did the job, and is the one number
every copy string derives from (`PRICING.displayPrice`, the lesson from the
TalkType $9→$24 hunt across five files). One dial:

```js
// src/lib/config/pricing.js
export const PRICING = {
  currentPrice: 9, currency: 'AUD', productName: 'DrShrink Passport',
  termDays: null, // permanent
  get displayPrice() { return `A$${this.currentPrice}`; },
};
```

Square's online fee on A$9 is roughly 20–30c; there is no renewal, no cloud
budget, no support load. At 30 sales a month it's coffee money that never asks
for anything back — exactly the brief.

## 4. Checkout — the one real decision

DrShrink is static today. The two lanes:

| | **A. Fleet Square plumbing** (port from TalkType) | **B. Static license verify** (Lemon Squeezy / Gumroad) |
|---|---|---|
| Server needed | Yes: `/api/passport/checkout`, `/api/square/webhook`, `/api/passport/redeem`, a license store (filesystem on the box; Netlify Blobs on the fallback) ≈ 460 lines ported | No. Buyer gets a key from the vendor; the app POSTs it to the vendor's public validate endpoint and stores the flag |
| Money lands | Same Square account as TalkType/ZipList | Vendor payout (LS 5% + 50c · Gumroad 10%) |
| Passkey / 4 words / holo card | Already built in TalkType, reuse verbatim | Vendor key is the code; 4-word phrase derived from it the same way |
| Recovery on a new device | Paste code / 4 words / one-tap `/u/<code>` link | Paste key (vendor also emails it) |
| Secrets | `SQUARE_*` + `PASSPORT_LICENSE_SECRET` via `~/.config/fleet/keys.env` → `keys-sync drshrink` | None in the app; CSP gains one `connect-src` origin |
| Keeps the Netlify fallback static | No (needs Blobs there) | Yes |
| Effort | ~1 day, proven pattern | ~half a day, new vendor |

**Recommendation: A.** It is the house pattern, the money stays in one place,
the passkey/card/recovery UX is already written, and the box already runs this
app under systemd with the fleet key system. Permanent term makes the port
*smaller* than TalkType's (no renewals, no expiry math). The Netlify fallback
can stay static — checkout simply returns the "needs server setup" 503 there,
which TalkType already handles.

## 5. Modals — adopt TalkType's Soft Neo Toybrut skin

The architecture stays (local Modal wrapper + closing flag — a sanctioned
lane in HERO-SPEC). Only the **skin** changes, to TalkType's current look:

- panel: 2px warm-dark border (`#292524`), `3px 3px 0` hard shadow, cream gradient `linear-gradient(145deg, #fffcf5, #fff6e6)`, radius 1.5rem, width `min(92vw, 30rem)`
- close: the squishy X — 44px round, brand-pink fill, 2px dark border, `2px 2px 0` shadow, rotates 90° on hover, squishes on press; drawn SVG glyph, never a typed ×
- pitch kit: hero mascot 64–72px · headline with the **marker highlight** under the punch word · one-line accent sub · `✓` list · one hard-shadow primary CTA (brand purple here, amber on TalkType) · quiet white secondaries
- Intro / About / Passport are siblings: same skeleton, different copy. Options keeps its rows but moves into the same panel + section-title style
- motion unchanged: pop-in 240ms `cubic-bezier(0.34,1.4,0.64,1)`, pop-out 150ms
- copy law: Sovereign Voice throughout (no you/your, no questions, no bossing); no emoji garnish in body copy; charm emoji only in footer/support chrome

Reference files: `talktype/src/app.css` (`.modal-box`, `.tt-pitch-*`,
`.tt-passport-code-*`), `talktype/src/lib/components/modals/ModalCloseButton.svelte`,
`IntroModal.svelte`, `AboutModal.svelte`, `modals/SupporterModal.svelte`.

## 6. Build order

1. `pricing.js` + Passport pitch modal (replaces the Ko-fi-only Supporter modal; Ko-fi stays as a quiet secondary "or just a coffee")
2. Modal skin pass (Modal.svelte, Intro, About, Options) — one evening
3. Shrink-style options behind `$isSupporter` (format · quality · fit-under · max size · audio-only · loose batches · longer memory)
4. Checkout lane (§4), success page, passkey redeem, one-tap unlock link
5. Holo card + Passport vibe
6. Second wave features as separate small projects

Verify with real money before announcing: sandbox card → webhook → unlock on a
second device via the 4 words. `fleet-check --deployed` after each ship.
