// ===================================================================
// MASCOT GRADIENT DEFINITIONS - generated from the active palettes
// ===================================================================
//
// GRADIENT_DEFS is rebuilt from palette data by rebuildGradientDefs(), which
// defineMascotThemes() calls at app startup. Each theme yields a linear gradient
// whose stops reference the --mascot-<theme>-* CSS vars (with hex fallbacks), so
// the gradientAnimator can flow them at runtime.

/** @type {Record<string, object>} */
export let GRADIENT_DEFS = {};

let FALLBACK_GRADIENT_ID = "";

/**
 * Build the stop list for one palette. 7 stops if mid4/mid5 exist (rainbow-style),
 * otherwise the standard 5 stops.
 */
function buildStops(themeName, colors) {
  const v = (key, hex) => `var(--mascot-${themeName}-${key}, ${hex})`;
  if (colors.mid4 && colors.mid5) {
    return [
      { offset: "0%", color: v("start", colors.start) },
      { offset: "16%", color: v("mid1", colors.mid1) },
      { offset: "32%", color: v("mid2", colors.mid2) },
      { offset: "48%", color: v("mid3", colors.mid3) },
      { offset: "64%", color: v("mid4", colors.mid4) },
      { offset: "80%", color: v("mid5", colors.mid5) },
      { offset: "100%", color: v("end", colors.end) },
    ];
  }
  return [
    { offset: "0%", color: v("start", colors.start) },
    { offset: "35%", color: v("mid1", colors.mid1) },
    { offset: "65%", color: v("mid2", colors.mid2) },
    { offset: "85%", color: v("mid3", colors.mid3) },
    { offset: "100%", color: v("end", colors.end) },
  ];
}

/**
 * Regenerate GRADIENT_DEFS from the given palettes. Called by defineMascotThemes().
 * @param {Record<string, object>} palettes
 */
export function rebuildGradientDefs(palettes) {
  const defs = {};
  for (const [themeName, colors] of Object.entries(palettes || {})) {
    defs[themeName] = {
      id: `${themeName}Gradient`,
      type: "linear",
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "100%",
      stops: buildStops(themeName, colors),
    };
  }
  GRADIENT_DEFS = defs;
  FALLBACK_GRADIENT_ID = Object.values(defs)[0]?.id || "";
  return GRADIENT_DEFS;
}

/**
 * Helper to get gradient ID for a theme
 * @param {string} theme - Theme name
 * @returns {string} - Gradient ID
 */
export function getGradientId(theme) {
  return GRADIENT_DEFS[theme]?.id || FALLBACK_GRADIENT_ID;
}

/**
 * Helper to get all gradient IDs
 * @returns {string[]} - Array of gradient IDs
 */
export function getAllGradientIds() {
  return Object.values(GRADIENT_DEFS).map((def) => def.id);
}
