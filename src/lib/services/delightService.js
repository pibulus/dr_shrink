// ===================================================================
// DELIGHT — one-off surprises, randomized copy, little doctor jokes.
// ===================================================================
// Pure data + tiny pickers. No deps. The fun lives here so the page stays
// readable and the pools are easy to grow. Dr. Shrink is a deadpan doctor
// who quietly loves squeezing the air out of your files.

/** Pick a random element. */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Drop-zone subtitle (rotates each page load / each return to idle) ──
const SUBTITLES = [
  "photos · audio · docs · text · a whole pile → zip",
  "feed me your chonky files",
  "drag it here, I'll make it smaller",
  "no settings, no uploads, no nonsense",
  "I do this for free. weird, right?",
  "photos, audio, docs — squeeze 'em all",
];
export function dropSubtitle() {
  return pick(SUBTITLES);
}

// ── Crunching labels (mostly the honest %, sometimes a flavor line) ──
const CRUNCH_QUIPS = [
  "squeezing the air out",
  "folding spacetime",
  "tightening the bolts",
  "compressing with feeling",
  "wringing it dry",
  "removing the fluff",
];
/**
 * The progress label. Honest "Crunching… 47%" most of the time, with an
 * occasional flavor line for the same percent (deterministic per call site
 * via `flavor` so it doesn't flicker every frame).
 */
export function crunchLabel(pct, flavor) {
  return flavor ? `${flavor}… ${pct}%` : `Crunching… ${pct}%`;
}
/** Roll once per job whether this run gets a flavor quip (1-in-4). */
export function maybeCrunchQuip() {
  return Math.random() < 0.25 ? pick(CRUNCH_QUIPS) : null;
}

// ── Done toast — scales with how hard we crushed ──
const TOAST_HUGE = [
  "🤯 vaporized",
  "🩺 doctor's orders: keep that one",
  "🥇 surgically removed",
  "💨 poof — mostly gone",
];
const TOAST_GOOD = ["nice and tight 🎉", "much better 🎉", "shrunk it 🎉"];
const TOAST_TINY = ["squeezed a little ✨", "every byte counts ✨"];
const TOAST_NONE = ["already healthy ✨", "nothing to trim ✨", "all good ✨"];
/**
 * @param {number} savedBytes total bytes removed
 * @param {number} ratio 0..1 fraction of the batch removed
 * @param {(n:number)=>string} fmt byte formatter
 */
export function doneToast(savedBytes, ratio, fmt) {
  if (savedBytes <= 0) return pick(TOAST_NONE);
  const size = fmt(savedBytes);
  if (ratio >= 0.9 || savedBytes > 10 * 1024 * 1024) {
    return `${pick(TOAST_HUGE)} — saved ${size}`;
  }
  if (ratio >= 0.15) return `Saved ${size} · ${pick(TOAST_GOOD)}`;
  return `Saved ${size} · ${pick(TOAST_TINY)}`;
}
/** Did this job earn the rare "you crushed it" celebration? */
export function isBigWin(savedBytes, ratio) {
  return ratio >= 0.9 || savedBytes > 10 * 1024 * 1024;
}

// ── Deadpan refusals (when a file's already compressed / can't shrink) ──
const REFUSE_LINES = [
  "this one's already healthy — send it home",
  "already squeezed dry, nothing for me to do",
  "can't improve on perfect (it's already tiny)",
];
export function refuseLine() {
  return pick(REFUSE_LINES);
}

// ── Tickle: rapid pokes make the doctor giggle ──
export const TICKLE_THRESHOLD = 5; // clicks
export const TICKLE_WINDOW = 1400; // ms within which they must land
const TICKLE_QUIPS = ["hehe", "that tickles", "okay okay", "quit it 😄"];
export function tickleQuip() {
  return pick(TICKLE_QUIPS);
}
