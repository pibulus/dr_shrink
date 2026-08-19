/**
 * Eye personality — the character lives in the eyes.
 *
 * Every SoftStack mascot shares the same body language (float, wobble, blink,
 * pointer-tracking); what makes each app's mascot feel like ITSELF is how the
 * eyes behave. This module is the single place that tunes that.
 *
 * ── HOW TO USE IN A NEW APP ─────────────────────────────────────────────
 * 1. Copy the mascot/ folder as usual (this file rides along).
 * 2. Pick an archetype at the call site:  <Mascot eyes="twitchy" ... />
 * 3. Or extend one with overrides:
 *      <Mascot eyes={{ archetype: 'listener', blinkMinGapMs: 2000 }} ... />
 * 4. New character? Add a named archetype here so the vocabulary grows.
 *
 * ── THE AXES ────────────────────────────────────────────────────────────
 * smoothing         0–1  how eagerly the eyes chase the pointer
 *                        (0.1 = dreamy drift · 0.8 = hair-trigger)
 * rangeX / rangeY   px   how far the pupils travel (curious vs shy)
 * blinkMinGapMs /        ambient blink cadence window
 * blinkMaxGapMs          (short window = alert/nervous · long = calm)
 * blinkDurationMs        how long a blink holds (slow = sleepy/deliberate)
 * doubleBlinkChance 0–1  odds a blink is a double-take (jittery energy)
 *
 * Daily mood (personality.js) still layers on top — these are the stable
 * TRAITS; mood is the day-to-day STATE. Trait + state = character.
 */

export const EYE_ARCHETYPES = {
  // The neutral baseline — matches the engine's historical constants.
  default: {
    smoothing: 0.45,
    rangeX: 6,
    rangeY: 3,
    blinkMinGapMs: 4000,
    blinkMaxGapMs: 9000,
    blinkDurationMs: 180,
    doubleBlinkChance: 0.25,
  },
  // The attentive listener (TalkType energy): locked on, wide gaze, rare blinks.
  listener: {
    smoothing: 0.6,
    rangeX: 8,
    rangeY: 4,
    blinkMinGapMs: 5000,
    blinkMaxGapMs: 12000,
    blinkDurationMs: 160,
    doubleBlinkChance: 0.15,
  },
  // Glitchy and overcaffeinated (Corruptor): hair-trigger gaze, quick nervous blinks.
  twitchy: {
    smoothing: 0.8,
    rangeX: 9,
    rangeY: 5,
    blinkMinGapMs: 1800,
    blinkMaxGapMs: 5200,
    blinkDurationMs: 110,
    doubleBlinkChance: 0.45,
  },
  // Slow deliberate intellect (DrShrink's brain): dreamy drift, long thoughtful blinks.
  thinker: {
    smoothing: 0.12,
    rangeX: 4,
    rangeY: 2.5,
    blinkMinGapMs: 6000,
    blinkMaxGapMs: 13000,
    blinkDurationMs: 260,
    doubleBlinkChance: 0.1,
  },
  // Doesn't want to see your data (metaflush): small evasive glances, frequent blinks.
  shifty: {
    smoothing: 0.55,
    rangeX: 4,
    rangeY: 2,
    blinkMinGapMs: 2500,
    blinkMaxGapMs: 6000,
    blinkDurationMs: 140,
    doubleBlinkChance: 0.35,
  },
  // Quick and bright (ZipList, lickety split): fast saccades, lively cadence.
  spry: {
    smoothing: 0.7,
    rangeX: 7,
    rangeY: 4,
    blinkMinGapMs: 3000,
    blinkMaxGapMs: 7000,
    blinkDurationMs: 130,
    doubleBlinkChance: 0.3,
  },
  // Heavy-lidded diarist (DaySay): warm slow gaze, long sleepy blinks.
  sleepy: {
    smoothing: 0.1,
    rangeX: 3.5,
    rangeY: 2,
    blinkMinGapMs: 2600,
    blinkMaxGapMs: 7500,
    blinkDurationMs: 340,
    doubleBlinkChance: 0.08,
  },
  // Proud and composed (metasplash): measured gaze, unhurried blinks.
  steady: {
    smoothing: 0.35,
    rangeX: 5.5,
    rangeY: 3,
    blinkMinGapMs: 4200,
    blinkMaxGapMs: 9500,
    blinkDurationMs: 180,
    doubleBlinkChance: 0.2,
  },
};

/**
 * Resolve an `eyes` prop into a full personality object.
 * Accepts an archetype name ('twitchy'), a partial override object
 * ({ archetype: 'listener', rangeX: 10 }), or nothing (default).
 */
export function resolveEyePersonality(eyes = "default") {
  if (typeof eyes === "string") {
    return { name: eyes, ...(EYE_ARCHETYPES[eyes] || EYE_ARCHETYPES.default) };
  }
  if (eyes && typeof eyes === "object") {
    const base = EYE_ARCHETYPES[eyes.archetype] || EYE_ARCHETYPES.default;
    const { archetype = "custom", ...overrides } = eyes;
    return { name: archetype, ...base, ...overrides };
  }
  return { name: "default", ...EYE_ARCHETYPES.default };
}

/**
 * Push a personality into the engine's shared config objects. The blink
 * scheduler reads BLINK_CONFIG at call time, and applyEyeTransforms turns the
 * normalized gaze into pixels via EYE_CONFIG.X/Y_MULTIPLIER — so mutating the
 * shared references once at mount is the least-invasive way to retune them
 * (one mascot per app — no cross-instance conflict).
 */
export function applyEyePersonalityToConfigs(
  personality,
  { blinkConfig, eyeConfig } = {},
) {
  if (!personality) return;
  if (blinkConfig) {
    blinkConfig.MIN_GAP = personality.blinkMinGapMs;
    blinkConfig.MAX_GAP = personality.blinkMaxGapMs;
    blinkConfig.SINGLE_DURATION = personality.blinkDurationMs;
    blinkConfig.DOUBLE_CHANCE = personality.doubleBlinkChance;
  }
  if (eyeConfig) {
    eyeConfig.SMOOTHING = personality.smoothing;
    eyeConfig.X_MULTIPLIER = personality.rangeX;
    eyeConfig.Y_MULTIPLIER = personality.rangeY;
  }
}
