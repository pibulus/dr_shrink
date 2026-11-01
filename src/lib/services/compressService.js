// ===================================================================
// COMPRESS SERVICE — the 80/20 "shrink anything" engine
// ===================================================================
//
// Philosophy: no settings, no fuss. Drop a file → get a smaller/more-useful one.
// One file → the obviously-right action for its type. Multiple files → a .zip.
//
// Eager deps stay tiny (native Canvas + fflate). Heavy converters (mammoth for
// docx, ffmpeg.wasm for audio/video) are lazy-imported only when their type is dropped.

import { zipSync, gzipSync } from "fflate";
import { DEFAULT_PREFS, sanitizePrefs } from "./shrinkPrefs.js";

// ── quality knobs ──
// Free runs ONE good default per type (no UI). The Passport picks a preset —
// still no sliders. Utility first: the output must still LOOK GOOD, not just
// be a small number. 0.86 WebP is visually near-lossless for photos while
// still cutting size a lot.
export const PRESETS = {
  lean: { image: 0.74, mp3q: "7", crf: "31", aac: "96k" },
  balanced: { image: 0.86, mp3q: "5", crf: "28", aac: "128k" },
  crisp: { image: 0.93, mp3q: "2", crf: "24", aac: "160k" },
};
/** Resolve a prefs object (or nothing) into the concrete knobs for a run. */
export function presetFor(prefs) {
  const p = sanitizePrefs(prefs);
  return { ...PRESETS[p.quality], ...p };
}
// Generous cap — only downscale genuinely huge images (phone photos are ~4000px);
// keep them usable for printing/zoom, don't shrink to a web thumbnail.
// (DEFAULT_PREFS.maxDim; a Passport can pick 2K / 1080p / original.)
const MB = 1024 * 1024;
// If we'd save less than this fraction, it's not worth degrading — keep original.
const MIN_WORTHWHILE_SAVING = 0.08; // need to save >8% to bother
// Batch safety fallback: if total input exceeds this, refuse — zip holds all
// files + a full zip copy in memory simultaneously (~2× peak). 300 MB keeps
// us well under mobile JS heap limits. The caller normally passes the tier's
// own ceiling (LIMITS.*.maxBatchBytes); this is the floor if it doesn't.
const DEFAULT_MAX_BATCH_BYTES = 300 * 1024 * 1024;

// ── type detection ──
// heic/heif ride with images: Safari decodes them natively (great outcome),
// other browsers fail decode and get a friendly "export as JPEG" error.
const IMAGE_RE = /\.(jpe?g|png|webp|bmp|gif|tiff?|heic|heif)$/i;
const TEXT_RE =
  /\.(txt|md|markdown|csv|tsv|json|log|svg|xml|yaml|yml|js|ts|css|html?|c|cpp|h|py|rb|go|rs|sh)$/i;
const DOCX_RE = /\.docx$/i;
const SVG_RE = /\.svg$/i;
const AUDIO_RE = /\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i;
const VIDEO_RE = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;
// already-compressed: gzip/zip won't help, and we have no better handler
const PACKED_RE = /\.(zip|gz|tgz|bz2|xz|7z|rar|dmg)$/i;
const PDF_RE = /\.pdf$/i;

export function isImage(file) {
  return file.type.startsWith("image/") || IMAGE_RE.test(file.name);
}
function isSvg(file) {
  return file.type === "image/svg+xml" || SVG_RE.test(file.name);
}
function isText(file) {
  return file.type.startsWith("text/") || TEXT_RE.test(file.name);
}
function isHtml(file) {
  return file.type === "text/html" || /\.html?$/i.test(file.name);
}
function isDocx(file) {
  return DOCX_RE.test(file.name);
}
function isAudio(file) {
  return file.type.startsWith("audio/") || AUDIO_RE.test(file.name);
}
function isVideo(file) {
  return file.type.startsWith("video/") || VIDEO_RE.test(file.name);
}
function isPacked(file) {
  return PACKED_RE.test(file.name);
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function result(blob, name, type, inputSize, note) {
  const outputSize = blob.size;
  return {
    blob,
    name,
    type,
    inputSize,
    outputSize,
    saved: inputSize - outputSize,
    ratio: inputSize ? outputSize / inputSize : 1,
    grew: outputSize >= inputSize,
    note: note || "",
  };
}

const baseName = (n) => n.replace(/\.[^.]+$/, "");

// ── image: re-encode → WebP (native Canvas) ──
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => (URL.revokeObjectURL(url), resolve(img));
    img.onerror = () => (
      URL.revokeObjectURL(url),
      reject(new Error("Could not decode image"))
    );
    img.src = url;
  });
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((r) => canvas.toBlob((b) => r(b), type, quality));
}
// AVIF encoding is Chrome-only for now (Canvas silently hands back PNG
// elsewhere). Probe once with a 1×1 and cache the verdict.
let _avif = null;
export async function supportsAvif() {
  if (_avif !== null) return _avif;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const b = await canvasToBlob(c, "image/avif", 0.5);
    _avif = b?.type === "image/avif";
  } catch {
    _avif = false;
  }
  return _avif;
}
// Detect an animated GIF or WebP (multiple frames) so we don't silently
// flatten it to a single frame via Canvas.
async function isAnimatedImage(file) {
  const isGif = /\.gif$/i.test(file.name) || file.type === "image/gif";
  const isWebp = /\.webp$/i.test(file.name) || file.type === "image/webp";
  const isPng = /\.png$/i.test(file.name) || file.type === "image/png";
  if (isGif) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 13) return false;
    // Count image descriptors, not optional Graphic Control Extensions.
    // Walking blocks avoids mistaking compressed pixels for a frame marker.
    let offset = 13 + (bytes[10] & 0x80 ? 3 * (1 << ((bytes[10] & 7) + 1)) : 0);
    let frames = 0;
    while (offset < bytes.length) {
      const marker = bytes[offset++];
      if (marker === 0x2c) {
        if (++frames > 1) return true;
        const packed = bytes[offset + 8];
        offset += 9 + (packed & 0x80 ? 3 * (1 << ((packed & 7) + 1)) : 0);
        offset++; // LZW minimum code size
      } else if (marker === 0x21)
        offset++; // extension label
      else return false; // trailer or malformed block
      let length;
      while (offset < bytes.length && (length = bytes[offset++]))
        offset += length;
    }
    return false;
  }
  if (isPng) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (offset + 12 + length > bytes.length) break;
      // APNG's animation control chunk records the number of frames.
      if (view.getUint32(offset + 4) === 0x6163544c && length === 8)
        return view.getUint32(offset + 8) > 1;
      offset += 12 + length;
    }
    return false;
  }
  if (isWebp) {
    // RIFF….WEBP with a VP8X extended header → animation flag is bit 0x02.
    const b = new Uint8Array(await file.slice(0, 21).arrayBuffer());
    const tag = (i, s) =>
      s.split("").every((ch, j) => b[i + j] === ch.charCodeAt(0));
    return (
      b.length >= 21 &&
      tag(0, "RIFF") &&
      tag(8, "WEBP") &&
      tag(12, "VP8X") &&
      (b[20] & 0x02) !== 0
    );
  }
  return false;
}

// Decode with EXIF orientation applied — createImageBitmap("from-image")
// lands phone photos upright. Fall back to a plain <img> decode where it's
// missing or chokes on a format.
async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> decode */
    }
  }
  return loadImage(file);
}

const EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

// Draw the decoded image onto a canvas no larger than maxDim on its long side.
function drawScaled(img, maxDim) {
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (maxDim && longest > maxDim) {
    const k = maxDim / longest;
    width = Math.max(1, Math.round(width * k));
    height = Math.max(1, Math.round(height * k));
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas;
}

// Encode in the requested format; Canvas quietly hands back PNG when an
// encoder is missing, so check the type that came back.
async function encodeAs(canvas, type, quality) {
  const b = await canvasToBlob(
    canvas,
    type,
    type === "image/png" ? undefined : quality,
  );
  return b && b.type === type ? b : null;
}

async function compressImage(file, prefs) {
  // Don't wreck animated GIFs/WebPs — Canvas can only capture frame 1.
  if (await isAnimatedImage(file)) {
    throw new Error(
      `${file.name} is animated — DrShrink would flatten it to one frame. Skipped to keep it intact.`,
    );
  }

  let img;
  try {
    img = await decodeImage(file);
  } catch {
    const hint = /\.(heic|heif)$/i.test(file.name)
      ? "it's a HEIC photo — this browser can't decode those. Export it as JPEG first."
      : "is it a real image?";
    throw new Error(`Couldn't read ${file.name} — ${hint}`);
  }

  const knobs = presetFor(prefs);
  const isJpegSrc = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  const notes = [];

  // Which encoders to try. Free/default: webp + the source family (the
  // smallest wins). Passport: the chosen format only, so the pick is honoured.
  let targets;
  if (knobs.format === "webp") {
    targets = ["image/webp", isJpegSrc ? "image/jpeg" : "image/png"];
  } else if (knobs.format === "avif") {
    if (await supportsAvif()) targets = ["image/avif"];
    else {
      targets = ["image/webp"];
      notes.push("avif unsupported here, webp instead");
    }
  } else if (knobs.format === "jpeg") {
    targets = ["image/jpeg"];
  } else {
    targets = ["image/png"];
  }

  const fitBytes = knobs.fitUnder ? knobs.fitUnder * MB : 0;
  let maxDim = knobs.maxDim;
  let quality = knobs.image;
  let canvas = drawScaled(img, maxDim);

  async function encodeBest(q) {
    const out = [];
    for (const t of targets) {
      const b = await encodeAs(canvas, t, q);
      if (b) out.push({ blob: b, type: t, ext: EXT[t] });
    }
    out.sort((a, b) => a.blob.size - b.blob.size);
    return out[0] || null;
  }

  let best = await encodeBest(quality);

  // Fit under N MB: walk quality down first (cheap, keeps pixels), then step
  // the long side down until it fits. Bounded — a handful of encodes, never
  // a runaway loop on a 100 MB TIFF.
  if (fitBytes && best && best.blob.size > fitBytes) {
    let tries = 0;
    const floorQ = targets[0] === "image/png" ? quality : 0.5;
    while (best.blob.size > fitBytes && tries < 10) {
      tries++;
      if (quality - 0.08 >= floorQ) {
        quality = +(quality - 0.08).toFixed(2);
      } else {
        const longest = Math.max(canvas.width, canvas.height);
        if (longest <= 800) break;
        maxDim = Math.max(800, Math.round(longest * 0.85));
        canvas = drawScaled(img, maxDim);
      }
      const next = await encodeBest(quality);
      if (!next) break;
      if (next.blob.size < best.blob.size) best = next;
    }
    notes.push(
      best.blob.size <= fitBytes
        ? `fits under ${knobs.fitUnder} MB`
        : `closest to ${knobs.fitUnder} MB`,
    );
  }
  img.close?.(); // free the ImageBitmap's pixel buffer

  // Utility guard: if re-encoding barely helps (or grows it), keep the original
  // rather than hand back a degraded file for a meaningless saving. When a
  // target size is on and the source is over it, any shrink is worth having.
  const mustShrink = fitBytes && file.size > fitBytes;
  const worthwhile =
    best &&
    (mustShrink
      ? best.blob.size < file.size
      : best.blob.size <= file.size * (1 - MIN_WORTHWHILE_SAVING));
  if (!worthwhile) {
    return result(
      file,
      file.name,
      file.type || "image/*",
      file.size,
      "already efficient — kept original",
    );
  }
  return result(
    best.blob,
    `${baseName(file.name)}.min.${best.ext}`,
    best.type,
    file.size,
    notes.join(" · "),
  );
}

// ── text/code: gzip → .gz ──
async function compressText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const gz = gzipSync(buf, { level: 9 });
  if (gz.length >= file.size)
    return keptOriginal(file, "application/octet-stream");
  return result(
    new Blob([gz], { type: "application/gzip" }),
    `${file.name}.gz`,
    "application/gzip",
    file.size,
  );
}

// ── html: strip to plain text ──
async function compressHtml(file) {
  const html = await file.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, template").forEach((el) => el.remove());
  doc
    .querySelectorAll("br, p, div, li, h1, h2, h3, h4, h5, h6, tr")
    .forEach((el) => el.append(doc.createTextNode("\n")));
  const text = (doc.body?.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  const blob = new Blob([text], { type: "text/plain" });
  return result(
    blob,
    `${baseName(file.name)}.txt`,
    "text/plain",
    file.size,
    "stripped to text",
  );
}

// ── svg: minify in-place (strip comments, whitespace, cruft) ──
async function compressSvg(file) {
  const raw = await file.text();
  let out = raw
    .replace(/<!--[\s\S]*?-->/g, "") // strip XML comments
    .replace(/<\?xml[^>]*\?>\s*/g, "") // strip XML declaration
    .replace(/<!DOCTYPE[^>]*>\s*/gi, ""); // strip doctype
  // Whitespace inside <text> runs (and xml:space="preserve") is rendered —
  // only collapse it when the SVG has no significant text content.
  if (
    !/<(?:text|tspan|style|script|foreignObject)[\s>]|xml:space\s*=\s*["']preserve/i.test(
      out,
    )
  ) {
    out = out
      .replace(/>\s+</g, "><") // collapse whitespace between tags
      .replace(/\s{2,}/g, " "); // collapse runs of spaces
  }
  out = out.trim();

  // Safety net: if the minified markup no longer parses, or barely helps,
  // hand back the original instead of a corrupted or pointless file.
  const reparsed = new DOMParser().parseFromString(out, "image/svg+xml");
  const broke = reparsed.querySelector("parsererror") !== null;
  const blob = new Blob([out], { type: "image/svg+xml" });
  if (broke || blob.size > file.size * (1 - MIN_WORTHWHILE_SAVING)) {
    return result(
      file,
      file.name,
      "image/svg+xml",
      file.size,
      "already efficient — kept original",
    );
  }
  return result(
    blob,
    `${baseName(file.name)}.min.svg`,
    "image/svg+xml",
    file.size,
    "minified",
  );
}

// ── docx → plain text (lazy mammoth) ──
async function compressDocx(file) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  const blob = new Blob([value.trim()], { type: "text/plain" });
  return result(
    blob,
    `${baseName(file.name)}.txt`,
    "text/plain",
    file.size,
    "extracted text",
  );
}

// ── audio → re-encode smaller (lazy ffmpeg, single-thread core) ──
let _ffmpeg = null;
let _onFFmpegProgress = null; // rebound per job — the instance is a singleton
async function getFFmpeg(onProgress) {
  _onFFmpegProgress = onProgress || null;
  if (_ffmpeg) return _ffmpeg;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const ff = new FFmpeg();
  ff.on("progress", ({ progress }) => _onFFmpegProgress?.(progress));
  // Same-origin ESM assets work inside the production CSP without blob scripts.
  // MUST be the ESM dist of @ffmpeg/core: the loader runs in a module worker
  // (no importScripts), so a UMD core fails to import and nothing ever loads.
  const base = "/wasm";
  const loading = ff.load({
    coreURL: `${base}/ffmpeg-core.js?v=0.12.10-esm`,
    wasmURL: `${base}/ffmpeg-core.wasm?v=0.12.10-esm`,
  });
  // If the worker dies quietly (bad URL, blocked script), load() never settles.
  // Never leave the user in an eternal "Shrinking…" — fail loud instead.
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(
            "The audio engine would not start, so this file was left untouched. A refresh usually wakes it up.",
          ),
        ),
      45000,
    );
  });
  try {
    await Promise.race([loading, timeout]);
  } catch (e) {
    ff.terminate?.();
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
  _ffmpeg = ff;
  return ff;
}
// exec resolves with ffmpeg's exit code instead of throwing — check it, or a
// failed run surfaces as a baffling "readFile" error on the missing output.
function assertExecOk(rc, file) {
  if (rc !== 0) {
    throw new Error(
      `Couldn't re-encode ${file.name} — that format (or codec) isn't supported here. Original left untouched.`,
    );
  }
}
// A tightly-encoded input can come out BIGGER — keep the original instead.
function keptOriginal(file, fallbackType) {
  return result(
    file,
    file.name,
    file.type || fallbackType,
    file.size,
    "already efficient — kept original",
  );
}
// Media duration in seconds via a metadata-only <audio>/<video> load — no
// ffprobe in the wasm build. 0 when the browser can't tell.
function mediaDuration(file, tag) {
  return new Promise((resolve) => {
    try {
      const el = document.createElement(tag);
      const url = URL.createObjectURL(file);
      const done = (d) => (URL.revokeObjectURL(url), resolve(d));
      el.preload = "metadata";
      el.onloadedmetadata = () =>
        done(Number.isFinite(el.duration) ? el.duration : 0);
      el.onerror = () => done(0);
      el.src = url;
    } catch {
      resolve(0);
    }
  });
}

// For a size target, the bitrate that lands the whole file under it, with a
// 4% container margin. Clamped to a sane range so speech never turns to mud.
function bitrateForTarget(targetBytes, seconds, min, max) {
  if (!seconds) return 0;
  const kbps = Math.floor(((targetBytes * 8) / seconds / 1000) * 0.96);
  return Math.max(min, Math.min(max, kbps));
}

async function runFFmpeg(ff, file, args) {
  const rc = await ff.exec(args);
  assertExecOk(rc, file);
}

// ── audio → mp3 (lazy ffmpeg, single-thread core) ──
async function compressAudio(file, onProgress, prefs) {
  const ff = await getFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");
  const knobs = presetFor(prefs);
  const inName = "in_" + file.name.replace(/[^\w.]/g, "_");
  const outName = "output.mp3";
  const notes = ["re-encoded mp3"];
  try {
    await ff.writeFile(inName, await fetchFile(file));
    const fitBytes = knobs.fitUnder ? knobs.fitUnder * MB : 0;
    let codecArgs = ["-qscale:a", knobs.mp3q]; // VBR — the good default
    if (fitBytes && file.size > fitBytes) {
      // Over the target: pick a CBR bitrate that lands under it.
      const secs = await mediaDuration(file, "audio");
      const kbps = bitrateForTarget(fitBytes, secs, 32, 192);
      if (kbps) codecArgs = ["-b:a", `${kbps}k`];
    }
    await runFFmpeg(ff, file, [
      "-i",
      inName,
      "-vn",
      "-codec:a",
      "libmp3lame",
      ...codecArgs,
      outName,
    ]);
    const data = await ff.readFile(outName);
    const blob = new Blob([data], { type: "audio/mpeg" });
    if (fitBytes)
      notes.push(
        blob.size <= fitBytes
          ? `fits under ${knobs.fitUnder} MB`
          : `closest to ${knobs.fitUnder} MB`,
      );
    const mustShrink = fitBytes && file.size > fitBytes;
    const worthwhile = mustShrink
      ? blob.size < file.size
      : blob.size <= file.size * (1 - MIN_WORTHWHILE_SAVING);
    if (!worthwhile) return keptOriginal(file, "audio/*");
    return result(
      blob,
      `${baseName(file.name)}.min.mp3`,
      "audio/mpeg",
      file.size,
      notes.join(" · "),
    );
  } finally {
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

// ── video → mp4 (same lazy ffmpeg.wasm), or just its audio as mp3 ──
async function compressVideo(file, onProgress, prefs) {
  const ff = await getFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");
  const knobs = presetFor(prefs);
  const inName = "in_" + file.name.replace(/[^\w.]/g, "_");
  const fitBytes = knobs.fitUnder ? knobs.fitUnder * MB : 0;

  // Audio only: strip the picture, keep the words. Tiny, and often the point.
  if (knobs.audioOnly) {
    const outName = "output.mp3";
    try {
      await ff.writeFile(inName, await fetchFile(file));
      let codecArgs = ["-qscale:a", knobs.mp3q];
      if (fitBytes) {
        const secs = await mediaDuration(file, "video");
        const kbps = bitrateForTarget(fitBytes, secs, 32, 192);
        if (kbps) codecArgs = ["-b:a", `${kbps}k`];
      }
      await runFFmpeg(ff, file, [
        "-i",
        inName,
        "-vn",
        "-codec:a",
        "libmp3lame",
        ...codecArgs,
        outName,
      ]);
      const data = await ff.readFile(outName);
      const blob = new Blob([data], { type: "audio/mpeg" });
      return result(
        blob,
        `${baseName(file.name)}.mp3`,
        "audio/mpeg",
        file.size,
        "audio only",
      );
    } finally {
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
    }
  }

  const outName = "output.mp4";
  const encode = (crf, aac, vf) =>
    runFFmpeg(ff, file, [
      "-i",
      inName,
      "-c:v",
      "libx264",
      "-crf",
      crf,
      "-pix_fmt",
      "yuv420p",
      "-vf",
      vf,
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      "-b:a",
      aac,
      "-movflags",
      "+faststart",
      outName,
    ]);
  const even = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  const notes = ["re-encoded mp4"];
  try {
    await ff.writeFile(inName, await fetchFile(file));
    // CRF 28 + ultrafast is the sweet spot (23 = near-lossless, 32 = visibly
    // compressed) at a bearable WASM speed. Presets move it 24 / 28 / 31.
    await encode(knobs.crf, knobs.aac, even);
    let data = await ff.readFile(outName);
    let blob = new Blob([data], { type: "video/mp4" });

    // One bounded second pass for a size target: harder CRF and a 720p cap.
    // WASM video is slow — two passes is the honest limit.
    if (fitBytes && blob.size > fitBytes) {
      await ff.deleteFile(outName).catch(() => {});
      await encode(
        String(Math.min(40, Number(knobs.crf) + 6)),
        "96k",
        "scale='min(1280,iw)':-2," + even,
      );
      data = await ff.readFile(outName);
      const second = new Blob([data], { type: "video/mp4" });
      if (second.size < blob.size) blob = second;
      notes.push(
        blob.size <= fitBytes
          ? `fits under ${knobs.fitUnder} MB`
          : `closest to ${knobs.fitUnder} MB`,
      );
    }

    const mustShrink = fitBytes && file.size > fitBytes;
    const worthwhile = mustShrink
      ? blob.size < file.size
      : blob.size <= file.size * (1 - MIN_WORTHWHILE_SAVING);
    if (!worthwhile) return keptOriginal(file, "video/*");
    return result(
      blob,
      `${baseName(file.name)}.min.mp4`,
      "video/mp4",
      file.size,
      notes.join(" · "),
    );
  } finally {
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

// ── batch → single .zip (shrink each shrinkable file first, then bundle) ──
async function zipFiles(files, onProgress, maxBatchBytes, prefs) {
  const inputTotal = files.reduce((a, f) => a + f.size, 0);
  const cap = maxBatchBytes || DEFAULT_MAX_BATCH_BYTES;
  if (inputTotal > cap) {
    throw new Error(
      `${formatBytes(inputTotal)} in one go — a zip batch tops out at ${formatBytes(cap)} total.`,
    );
  }
  // null prototype so a file named "__proto__" or "constructor" can't vanish
  // or collide with Object.prototype keys.
  const entries = Object.create(null);
  let i = 0;
  let unchanged = 0;
  for (const f of files) {
    onProgress?.(i / files.length);
    let bytes = null;
    const path = (f.relativePath || f.webkitRelativePath || f.name)
      .replace(/\\/g, "/")
      .split("/")
      .filter((part) => part && part !== "." && part !== "..")
      .join("/");
    const directory = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/") + 1)
      : "";
    let name = path;
    // ZIP already compresses text. Preserve document structure in batches;
    // plain-text extraction belongs to the single-file flow only.
    if (isImage(f) || isAudio(f) || isVideo(f)) {
      try {
        // scale per-file ffmpeg progress into this file's slice of the batch
        const idx = i;
        const r = await compressOne(
          f,
          (p) =>
            onProgress?.((idx + Math.max(0, Math.min(1, p))) / files.length),
          prefs,
        );
        // only keep the compressed version if it actually got smaller
        if (r.outputSize < f.size) {
          bytes = new Uint8Array(await r.blob.arrayBuffer());
          name = directory + r.name;
        }
      } catch {
        /* fall through to raw copy */
      }
    }
    if (!bytes) {
      bytes = new Uint8Array(await f.arrayBuffer());
      unchanged++;
    }
    // avoid name collisions in the zip
    let unique = name;
    let suffix = 1;
    while (unique in entries)
      unique = `${directory}${suffix++}_${name.slice(directory.length)}`;
    entries[unique] = bytes;
    i++;
  }
  onProgress?.(1);
  const zipped = zipSync(entries, { level: 6 });
  const blob = new Blob([zipped], { type: "application/zip" });
  return result(
    blob,
    `drshrink-${files.length}-files.zip`,
    "application/zip",
    inputTotal,
    `${files.length} files${unchanged ? ` · ${unchanged} kept in original format` : ""}`,
  );
}

// Loose batch (Passport): every file comes back on its own, no zip. Each
// result carries its own error-or-output; one bad file never sinks the rest.
async function looseFiles(files, onProgress, prefs) {
  const out = [];
  let i = 0;
  for (const f of files) {
    const idx = i++;
    onProgress?.(idx / files.length);
    try {
      out.push(
        await compressOne(
          f,
          (p) =>
            onProgress?.((idx + Math.max(0, Math.min(1, p))) / files.length),
          prefs,
        ),
      );
    } catch (e) {
      out.push(keptOriginal(f, "application/octet-stream"));
      out[out.length - 1].note = e?.message || "left untouched";
    }
  }
  onProgress?.(1);
  return out;
}

/**
 * Compress one file by its type. `onProgress(0..1)` is used for slow ops
 * (audio/video). `prefs` (optional) are the Passport dials — see shrinkPrefs.
 */
export async function compressOne(file, onProgress, prefs = DEFAULT_PREFS) {
  if (isSvg(file)) return compressSvg(file);
  if (isImage(file)) return compressImage(file, prefs);
  if (isDocx(file)) return compressDocx(file);
  if (isHtml(file)) return compressHtml(file);
  if (isText(file)) return compressText(file);
  if (isAudio(file)) return compressAudio(file, onProgress, prefs);
  if (isVideo(file)) return compressVideo(file, onProgress, prefs);
  if (PDF_RE.test(file.name)) {
    throw new Error(
      `PDF squeezing isn't in the doctor's kit yet — it's on the roadmap.`,
    );
  }
  if (isPacked(file)) {
    throw new Error(`${file.name} is already compressed — nothing to shrink.`);
  }
  // unknown → gzip fallback (the universal "any file → smaller" net)
  return compressText(file);
}

/**
 * Top-level entry. Single file → its handler. Multiple files → one .zip
 * (or one result per file when prefs.looseBatch). Returns an array.
 */
export async function compress(
  fileList,
  { onProgress, maxBatchBytes, prefs = DEFAULT_PREFS } = {},
) {
  const files = [...fileList];
  if (files.length === 0) return [];
  const p = sanitizePrefs(prefs);
  if (files.length > 1) {
    if (p.looseBatch) return looseFiles(files, onProgress, p);
    return [await zipFiles(files, onProgress, maxBatchBytes, p)];
  }
  return [await compressOne(files[0], onProgress, p)];
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
