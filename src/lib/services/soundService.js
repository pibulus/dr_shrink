// ===================================================================
// SOUND — gentle Web Audio cues (no asset files, à la TalkType/ZipList)
// ===================================================================
// Tiny synthesized blips for key moments only: drop accepted, shrink done,
// error. Muteable + persisted. Lazily creates the AudioContext on first use
// (browsers require a user gesture, which dropping/clicking provides).

import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { readStorage } from "./storage.js";

const KEY = "drshrink-muted";

function initialMuted() {
  if (!browser) return false;
  return readStorage(KEY) === "true";
}

export const muted = writable(initialMuted());

let _ctx = null;
function ctx() {
  if (!browser) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    if (!_ctx) _ctx = new AC();
  } catch {
    return null;
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

let isMuted = initialMuted();
muted.subscribe((v) => {
  isMuted = v;
  if (browser) {
    try {
      localStorage.setItem(KEY, v ? "true" : "false");
    } catch {
      /* ignore */
    }
  }
});

export function toggleMuted() {
  muted.update((v) => !v);
}

/**
 * Play a short note. notes: [{freq, start, dur, type, gain, slideTo}]
 * `slideTo` (optional) glides the pitch from `freq` → `slideTo` across the note —
 * the secret to the "squeeze" whoosh and the satisfying "thunk".
 */
function play(notes) {
  if (isMuted) return;
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type || "sine";
    const start = t0 + (n.start || 0);
    const dur = n.dur || 0.12;
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slideTo) {
      // exponential glide reads as a physical squeeze / drop, not a beep
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, n.slideTo),
        start + dur,
      );
    }
    const peak = n.gain ?? 0.06;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

// ── the cues (soft, short, pleasant) ──

/** A gentle "tick" when a file is accepted. */
export function soundDrop() {
  play([{ freq: 523.25, dur: 0.08, type: "sine", gain: 0.05 }]); // C5
}

/**
 * The "squeeze" — a quick descending whoosh, like air being pressed out.
 * Played the moment crunching starts, so the squish has a voice.
 */
export function soundShrink() {
  play([
    { freq: 760, slideTo: 240, dur: 0.22, type: "sine", gain: 0.05 },
    {
      freq: 380,
      slideTo: 150,
      start: 0.04,
      dur: 0.2,
      type: "triangle",
      gain: 0.03,
    },
  ]);
}

/**
 * A satisfying "shrink → done" — scales with how much we saved.
 * @param {number} ratioSaved 0..1 fraction of bytes removed (0 = grew/none).
 * Big save → a deeper "thunk" lands first, then a brighter sparkle on top.
 * Tiny save → just the polite little rising chime.
 */
export function soundDone(ratioSaved = 0) {
  const r = Math.max(0, Math.min(1, ratioSaved));
  const notes = [
    { freq: 587.33, start: 0, dur: 0.12, type: "sine", gain: 0.06 }, // D5
    { freq: 880.0, start: 0.09, dur: 0.16, type: "sine", gain: 0.06 }, // A5
  ];
  if (r >= 0.25) {
    // a low "thunk" of compacted weight, deeper the more we crushed
    const thunk = 150 - r * 60; // 150 → ~90 Hz
    notes.unshift({
      freq: thunk * 1.6,
      slideTo: thunk,
      start: 0,
      dur: 0.16,
      type: "sine",
      gain: 0.05 + r * 0.03,
    });
  }
  if (r >= 0.6) {
    // a little sparkle flourish for the big wins
    notes.push({
      freq: 1174.66,
      start: 0.22,
      dur: 0.14,
      type: "sine",
      gain: 0.045,
    }); // D6
  }
  play(notes);
}

/** A soft low "nope" for errors. */
export function soundError() {
  play([{ freq: 196.0, dur: 0.18, type: "triangle", gain: 0.05 }]); // G3
}

/** A giggly little arpeggio when you tickle the doctor (rapid pokes). */
export function soundTickle() {
  play([
    { freq: 659.25, start: 0, dur: 0.07, type: "triangle", gain: 0.05 }, // E5
    { freq: 783.99, start: 0.06, dur: 0.07, type: "triangle", gain: 0.05 }, // G5
    { freq: 987.77, start: 0.12, dur: 0.07, type: "triangle", gain: 0.05 }, // B5
    { freq: 1318.51, start: 0.18, dur: 0.09, type: "triangle", gain: 0.05 }, // E6
  ]);
}
