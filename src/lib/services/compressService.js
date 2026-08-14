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

// ── quality knobs (80/20: one good default each, no UI) ──
// Utility first: the output must still LOOK GOOD, not just be a small number.
// 0.86 WebP is visually near-lossless for photos while still cutting size a lot.
const IMAGE_QUALITY = 0.86;
// Generous cap — only downscale genuinely huge images (phone photos are ~4000px);
// keep them usable for printing/zoom, don't shrink to a web thumbnail.
const MAX_DIMENSION = 3840;
// If we'd save less than this fraction, it's not worth degrading — keep original.
const MIN_WORTHWHILE_SAVING = 0.08; // need to save >8% to bother
// Batch safety: if total input exceeds this, refuse — zip holds all files
// + a full zip copy in memory simultaneously (~2× peak). 300 MB keeps us
// well under mobile JS heap limits.
const MAX_BATCH_BYTES = 300 * 1024 * 1024;

// ── type detection ──
const IMAGE_RE = /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i;
const TEXT_RE =
  /\.(txt|md|markdown|csv|tsv|json|log|svg|xml|yaml|yml|js|ts|css|html?|c|cpp|h|py|rb|go|rs|sh)$/i;
const DOCX_RE = /\.docx$/i;
const SVG_RE = /\.svg$/i;
const AUDIO_RE = /\.(mp3|wav|m4a|aac|ogg|flac|aiff?)$/i;
const VIDEO_RE = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;
// already-compressed: gzip/zip won't help, and we have no better handler
const PACKED_RE = /\.(zip|gz|7z|rar|pdf|heic)$/i;

export function isImage(file) {
  return file.type.startsWith("image/") || IMAGE_RE.test(file.name);
}
function isSvg(file) {
  return file.type === "image/svg+xml" || SVG_RE.test(file.name);
}
function isText(file) {
  return file.type.startsWith("text/") || TEXT_RE.test(file.name);
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
// Detect an animated GIF (multiple image frames) so we don't silently flatten it
// to a single frame via Canvas. Looks for >1 Graphic Control Extension block.
async function isAnimatedGif(file) {
  if (!/\.gif$/i.test(file.name) && file.type !== "image/gif") return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let frames = 0;
  for (let i = 0; i < bytes.length - 3; i++) {
    // 0x21 0xF9 0x04 = Graphic Control Extension (one per frame)
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
      if (++frames > 1) return true;
    }
  }
  return false;
}

async function compressImage(file) {
  // Don't wreck animated GIFs — Canvas can only capture frame 1.
  if (await isAnimatedGif(file)) {
    throw new Error(
      `${file.name} is an animated GIF — DrShrink would flatten it. Skipped to keep it intact.`,
    );
  }

  const img = await loadImage(file);
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > MAX_DIMENSION) {
    const k = MAX_DIMENSION / longest;
    width = Math.round(width * k);
    height = Math.round(height * k);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);

  const candidates = [];
  const webp = await canvasToBlob(canvas, "image/webp", IMAGE_QUALITY);
  if (webp) candidates.push({ blob: webp, ext: "webp", type: "image/webp" });
  const srcType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const reSrc = await canvasToBlob(
    canvas,
    srcType,
    srcType === "image/jpeg" ? IMAGE_QUALITY : undefined,
  );
  if (reSrc)
    candidates.push({
      blob: reSrc,
      ext: srcType === "image/png" ? "png" : "jpg",
      type: srcType,
    });

  candidates.sort((a, b) => a.blob.size - b.blob.size);
  const best = candidates[0];

  // Utility guard: if re-encoding barely helps (or grows it), keep the original
  // rather than hand back a degraded file for a meaningless saving.
  if (!best || best.blob.size > file.size * (1 - MIN_WORTHWHILE_SAVING)) {
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
  );
}

// ── text/code: gzip → .gz ──
async function compressText(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const gz = gzipSync(buf, { level: 9 });
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
  const out = raw
    .replace(/<!--[\s\S]*?-->/g, "") // strip XML comments
    .replace(/<\?xml[^>]*\?>\s*/g, "") // strip XML declaration
    .replace(/<!DOCTYPE[^>]*>\s*/gi, "") // strip doctype
    .replace(/>\s+</g, "><") // collapse whitespace between tags
    .replace(/\s{2,}/g, " ") // collapse runs of spaces
    .trim();
  const blob = new Blob([out], { type: "image/svg+xml" });
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
async function getFFmpeg(onProgress) {
  if (_ffmpeg) return _ffmpeg;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ff = new FFmpeg();
  if (onProgress) ff.on("progress", ({ progress }) => onProgress(progress));
  // WASM self-hosted from /wasm/ — keeps user data off CDN servers and
  // allows the COEP require-corp header (unpkg won't serve under it).
  // MUST be the ESM dist of @ffmpeg/core: the loader runs in a module worker
  // (no importScripts), so a UMD core fails to import and nothing ever loads.
  const base = "/wasm";
  const loading = ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  // If the worker dies quietly (bad URL, blocked script), load() never settles.
  // Never leave the user in an eternal "Shrinking…" — fail loud instead.
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "The audio engine would not start, so this file was left untouched. A refresh usually wakes it up.",
          ),
        ),
      45000,
    ),
  );
  try {
    await Promise.race([loading, timeout]);
  } catch (e) {
    ff.terminate?.();
    throw e;
  }
  _ffmpeg = ff;
  return ff;
}
async function compressAudio(file, onProgress) {
  const ff = await getFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");
  const inName = "in_" + file.name.replace(/[^\w.]/g, "_");
  const outName = baseName(file.name) + ".min.mp3";
  await ff.writeFile(inName, await fetchFile(file));
  try {
    // 80/20: a sane VBR mp3 (~quality 5, ~128kbps avg) — much smaller, fine for most.
    await ff.exec([
      "-i",
      inName,
      "-codec:a",
      "libmp3lame",
      "-qscale:a",
      "5",
      outName,
    ]);
    const data = await ff.readFile(outName);
    const blob = new Blob([data], { type: "audio/mpeg" });
    return result(blob, outName, "audio/mpeg", file.size, "re-encoded mp3");
  } finally {
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

// ── video → re-encode mp4 (same lazy ffmpeg.wasm) ──
async function compressVideo(file, onProgress) {
  const ff = await getFFmpeg(onProgress);
  const { fetchFile } = await import("@ffmpeg/util");
  const inName = "in_" + file.name.replace(/[^\w.]/g, "_");
  const outName = baseName(file.name) + ".min.mp4";
  await ff.writeFile(inName, await fetchFile(file));
  try {
    // 80/20: CRF 28 + ultrafast preset — good shrink, bearable WASM speed.
    // CRF 28 is the sweet spot (23 = near-lossless, 32 = visibly compressed).
    await ff.exec([
      "-i",
      inName,
      "-c:v",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outName,
    ]);
    const data = await ff.readFile(outName);
    const blob = new Blob([data], { type: "video/mp4" });
    return result(blob, outName, "video/mp4", file.size, "re-encoded mp4");
  } finally {
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

// ── batch → single .zip (shrink each shrinkable file first, then bundle) ──
async function zipFiles(files, onProgress) {
  const inputTotal = files.reduce((a, f) => a + f.size, 0);
  if (inputTotal > MAX_BATCH_BYTES) {
    throw new Error(
      `${formatBytes(inputTotal)} total is too much for one batch. Try fewer or smaller files.`,
    );
  }
  const entries = {};
  let i = 0;
  for (const f of files) {
    onProgress?.(i / files.length);
    let bytes, name;
    // Try to shrink images/text/docx/audio/video individually before bundling; otherwise store raw.
    if (
      isImage(f) ||
      isText(f) ||
      isDocx(f) ||
      file_isHtml(f) ||
      isAudio(f) ||
      isVideo(f)
    ) {
      try {
        const r = await compressOne(f);
        // only keep the compressed version if it actually got smaller
        bytes =
          r.outputSize < f.size
            ? new Uint8Array(await r.blob.arrayBuffer())
            : new Uint8Array(await f.arrayBuffer());
        name = r.outputSize < f.size ? r.name : f.name;
      } catch {
        bytes = new Uint8Array(await f.arrayBuffer());
        name = f.name;
      }
    } else {
      bytes = new Uint8Array(await f.arrayBuffer());
      name = f.name;
    }
    // avoid name collisions in the zip
    entries[entries[name] ? `${i}_${name}` : name] = bytes;
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
    `${files.length} files`,
  );
}

function file_isHtml(f) {
  return f.type === "text/html" || /\.html?$/i.test(f.name);
}

/**
 * Compress one file by its type. `onProgress(0..1)` is used for slow ops (audio).
 */
export async function compressOne(file, onProgress) {
  if (isSvg(file)) return compressSvg(file);
  if (isImage(file)) return compressImage(file);
  if (isDocx(file)) return compressDocx(file);
  if (file.type === "text/html" || /\.html?$/i.test(file.name))
    return compressHtml(file);
  if (isText(file)) return compressText(file);
  if (isAudio(file)) return compressAudio(file, onProgress);
  if (isVideo(file)) return compressVideo(file, onProgress);
  if (isPacked(file)) {
    throw new Error(`${file.name} is already compressed — nothing to shrink.`);
  }
  // unknown → gzip fallback (the universal "any file → smaller" net)
  return compressText(file);
}

/**
 * Top-level entry. Single file → its handler. Multiple files → one .zip.
 * Returns an array of results.
 */
export async function compress(fileList, { onProgress } = {}) {
  const files = [...fileList];
  if (files.length === 0) return [];
  if (files.length > 1) return [await zipFiles(files, onProgress)];
  return [await compressOne(files[0], onProgress)];
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
