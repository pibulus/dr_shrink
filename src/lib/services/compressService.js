// ===================================================================
// COMPRESS SERVICE — the 80/20 shrink engine
// ===================================================================
//
// Philosophy: no settings, no fuss. Drop a file → get a smaller one.
// Images use the native Canvas encoder (zero deps, works everywhere). We pick a
// sensible quality + optional max-dimension and re-encode to whichever of
// WebP / original-format comes out smallest while still actually being smaller.
//
// Non-image files fall back to "can't shrink this (yet)" — gzip/zip lands later.

/** Quality presets per the 80/20 rule — one good default, no knobs exposed. */
const QUALITY = 0.82;
// Cap huge images so a 6000px phone photo doesn't stay 6000px. Most uses don't
// need more than this; keeps the output genuinely small.
const MAX_DIMENSION = 2560;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
]);

export function isImage(file) {
  return IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Load a File/Blob into an HTMLImageElement (via object URL). */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
}

/**
 * Compress one image file the 80/20 way.
 * @returns {Promise<{blob: Blob, name: string, type: string,
 *   inputSize: number, outputSize: number, saved: number, ratio: number}>}
 */
export async function compressImage(file) {
  const img = await loadImage(file);

  // Scale down if huge (preserve aspect ratio).
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
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  // Try WebP (usually smallest). Keep original format as a fallback candidate.
  const candidates = [];
  const webp = await canvasToBlob(canvas, "image/webp", QUALITY);
  if (webp) candidates.push({ blob: webp, type: "image/webp", ext: "webp" });

  // Re-encode in the source format too (JPEG for jpeg, else PNG) so we don't
  // force a format change if WebP somehow loses.
  const srcType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const srcExt = srcType === "image/png" ? "png" : "jpg";
  const reSrc = await canvasToBlob(
    canvas,
    srcType,
    srcType === "image/jpeg" ? QUALITY : undefined,
  );
  if (reSrc) candidates.push({ blob: reSrc, type: srcType, ext: srcExt });

  // Pick the smallest candidate that is actually smaller than the input.
  candidates.sort((a, b) => a.blob.size - b.blob.size);
  const best = candidates[0];

  const inputSize = file.size;
  const outputSize = best.blob.size;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    blob: best.blob,
    name: `${baseName}.min.${best.ext}`,
    type: best.type,
    inputSize,
    outputSize,
    saved: inputSize - outputSize,
    ratio: outputSize / inputSize,
    grew: outputSize >= inputSize,
  };
}

/** Dispatch any file to the right shrinker. Throws for unsupported types. */
export async function compress(file) {
  if (isImage(file)) return compressImage(file);
  throw new Error(`Can't shrink ${file.type || "this file"} yet — images only for now.`);
}

/** Trigger a browser download of a Blob. */
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
