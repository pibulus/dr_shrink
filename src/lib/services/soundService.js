// ===================================================================
// SOUND — gentle Web Audio cues (no asset files, à la TalkType/ZipList)
// ===================================================================
// Tiny synthesized blips for key moments only: drop accepted, shrink done,
// error. Muteable + persisted. Lazily creates the AudioContext on first use
// (browsers require a user gesture, which dropping/clicking provides).

import { writable } from "svelte/store";
import { browser } from "$app/environment";

const KEY = "drshrink-muted";

function initialMuted() {
  if (!browser) return false;
  return localStorage.getItem(KEY) === "true";
}

export const muted = writable(initialMuted());

let _ctx = null;
function ctx() {
  if (!browser) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
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
 * Play a short note. notes: [{freq, start, dur, type, gain}]
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
    osc.frequency.setValueAtTime(n.freq, t0 + (n.start || 0));
    const peak = n.gain ?? 0.06;
    const start = t0 + (n.start || 0);
    const dur = n.dur || 0.12;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

// ── the three cues (soft, short, pleasant) ──

/** A gentle "tick" when a file is accepted. */
export function soundDrop() {
  play([{ freq: 523.25, dur: 0.08, type: "sine", gain: 0.05 }]); // C5
}

/** A satisfying little 2-note "shrink → done" chime (rising). */
export function soundDone() {
  play([
    { freq: 587.33, start: 0, dur: 0.12, type: "sine", gain: 0.06 }, // D5
    { freq: 880.0, start: 0.09, dur: 0.16, type: "sine", gain: 0.06 }, // A5
  ]);
}

/** A soft low "nope" for errors. */
export function soundError() {
  play([{ freq: 196.0, dur: 0.18, type: "triangle", gain: 0.05 }]); // G3
}
