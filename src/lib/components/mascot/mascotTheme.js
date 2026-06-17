/**
 * mascotTheme.js — self-contained theme module for the portable mascot.
 *
 * PORTABLE: no imports outside this folder + svelte + $app/environment.
 * An app defines its own palettes via `defineMascotThemes(palettes, {fallback})`
 * and drives the current theme via the `theme` writable / `setTheme(name)`.
 * Persistence (localStorage, data-theme attribute, etc.) is the APP's job —
 * the mascot only reflects whatever `theme` is set to.
 *
 * Palette shape per theme (only start/mid1.../end are required; the rest enrich
 * the animation but are optional — generators guard every key):
 *   {
 *     start, startBright, mid1, mid1Bright, mid2, mid2Bright,
 *     mid3, mid3Bright, [mid4, mid4Bright, mid5, mid5Bright,]
 *     end, endBright,
 *     glowPrimary, glowSecondary, glowTertiary, [glowQuaternary, ...]
 *     shadowColor, shadowColorBright, shadowColorBrightest, [shadowColorBrighter, ...]
 *   }
 */
import { writable, derived } from "svelte/store";
import { browser } from "$app/environment";
import { gradientAnimations, shapeAnimations } from "./gradientConfig";
import { WOBBLE_CONFIG, SPECIAL_CONFIG } from "./animationConfig";
import { rebuildGradientDefs } from "./gradients";

// ───────────────────────────────────────────────────────────────────────────
// Built-in default palettes (the original TalkType set). An app can replace
// these wholesale with defineMascotThemes(), or keep them as a starting point.
// ───────────────────────────────────────────────────────────────────────────
const DEFAULT_PALETTES = {
  peach: {
    start: "#ff60e0",
    startBright: "#ff4aed",
    mid1: "#ff82ca",
    mid1Bright: "#ff70d6",
    mid2: "#ff9a85",
    mid2Bright: "#ff8890",
    mid3: "#ffb060",
    mid3Bright: "#ffa550",
    end: "#ffcf40",
    endBright: "#ffdf30",
    glowPrimary: "rgba(255, 80, 150, 1)",
    glowSecondary: "rgba(255, 150, 100, 0.9)",
    glowTertiary: "rgba(255, 240, 200, 0.8)",
    shadowColor: "rgba(255, 180, 140, 0.3)",
    shadowColorBright: "rgba(255, 190, 170, 0.4)",
    shadowColorBrightest: "rgba(255, 210, 200, 0.5)",
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Mutable registry — populated by defineMascotThemes(), defaults until then.
// ───────────────────────────────────────────────────────────────────────────
let PALETTES = { ...DEFAULT_PALETTES };
export let FALLBACK_THEME = Object.keys(PALETTES)[0];

// Build gradient defs for the default palettes immediately so the component
// renders even if an app forgets to call defineMascotThemes().
rebuildGradientDefs(PALETTES);

/**
 * Register an app's mascot palettes. Call once at app startup (e.g. in the root
 * +layout). Returns the theme controls for convenience.
 * @param {Record<string, object>} palettes
 * @param {{ fallback?: string }} [opts]
 */
export function defineMascotThemes(palettes, opts = {}) {
  if (palettes && Object.keys(palettes).length) {
    PALETTES = { ...palettes };
  }
  FALLBACK_THEME =
    opts.fallback && PALETTES[opts.fallback]
      ? opts.fallback
      : Object.keys(PALETTES)[0];
  rebuildGradientDefs(PALETTES);
  // Initialise the current theme to the fallback if not already set.
  theme.update((v) => (v && PALETTES[v] ? v : FALLBACK_THEME));
  return { theme, setTheme, ensureMascotThemeStyles, getThemeNames };
}

export function getThemeNames() {
  return Object.keys(PALETTES);
}

function sanitizeTheme(themeName) {
  return PALETTES[themeName] ? themeName : FALLBACK_THEME;
}

// Current theme — a plain writable the app drives. No storage side-effects.
const theme = writable(FALLBACK_THEME);

export function setTheme(newTheme) {
  const safe = sanitizeTheme(newTheme);
  if (safe !== newTheme) console.warn(`[mascot] unknown theme: ${newTheme}`);
  theme.set(safe);
}

// ───────────────────────────────────────────────────────────────────────────
// CSS-variable generation (reads the injected PALETTES).
// ───────────────────────────────────────────────────────────────────────────
function getGlobalAnimationVariables() {
  return (
    `\n/* Global Animation Configuration */\n` +
    `--mascot-wobble-duration: ${WOBBLE_CONFIG.DURATION / 1000}s;\n` +
    `--mascot-special-duration: ${SPECIAL_CONFIG.DURATION / 1000}s;\n`
  );
}

export function generateThemeCssVariables(themeName = FALLBACK_THEME) {
  const safeTheme = PALETTES[themeName] ? themeName : FALLBACK_THEME;
  let cssVars = "";

  const colors = PALETTES[safeTheme];
  if (!colors) return cssVars;

  const animConfig = gradientAnimations[safeTheme];
  const shapeConfig = shapeAnimations[safeTheme];

  cssVars += `--mascot-${safeTheme}-start: ${colors.start};\n`;
  cssVars += `--mascot-${safeTheme}-start-bright: ${colors.startBright};\n`;
  cssVars += `--mascot-${safeTheme}-mid1: ${colors.mid1};\n`;
  cssVars += `--mascot-${safeTheme}-mid1-bright: ${colors.mid1Bright};\n`;
  cssVars += `--mascot-${safeTheme}-mid2: ${colors.mid2};\n`;
  cssVars += `--mascot-${safeTheme}-mid2-bright: ${colors.mid2Bright};\n`;
  cssVars += `--mascot-${safeTheme}-mid3: ${colors.mid3};\n`;
  cssVars += `--mascot-${safeTheme}-mid3-bright: ${colors.mid3Bright};\n`;
  if (colors.mid4) {
    cssVars += `--mascot-${safeTheme}-mid4: ${colors.mid4};\n`;
    cssVars += `--mascot-${safeTheme}-mid4-bright: ${colors.mid4Bright};\n`;
  }
  if (colors.mid5) {
    cssVars += `--mascot-${safeTheme}-mid5: ${colors.mid5};\n`;
    cssVars += `--mascot-${safeTheme}-mid5-bright: ${colors.mid5Bright};\n`;
  }
  cssVars += `--mascot-${safeTheme}-end: ${colors.end};\n`;
  cssVars += `--mascot-${safeTheme}-end-bright: ${colors.endBright};\n`;

  cssVars += `--mascot-${safeTheme}-glow-primary: ${colors.glowPrimary};\n`;
  cssVars += `--mascot-${safeTheme}-glow-secondary: ${colors.glowSecondary};\n`;
  cssVars += `--mascot-${safeTheme}-glow-tertiary: ${colors.glowTertiary};\n`;

  if (colors.glowQuaternary) {
    cssVars += `--mascot-${safeTheme}-glow-quaternary: ${colors.glowQuaternary};\n`;
    cssVars += `--mascot-${safeTheme}-glow-quinary: ${colors.glowQuinary};\n`;
    cssVars += `--mascot-${safeTheme}-glow-senary: ${colors.glowSenary};\n`;
  }

  cssVars += `--mascot-${safeTheme}-shadow-color: ${colors.shadowColor};\n`;
  cssVars += `--mascot-${safeTheme}-shadow-color-bright: ${colors.shadowColorBright};\n`;
  cssVars += `--mascot-${safeTheme}-shadow-color-brightest: ${colors.shadowColorBrightest};\n`;

  if (colors.shadowColorBrighter) {
    cssVars += `--mascot-${safeTheme}-shadow-color-brighter: ${colors.shadowColorBrighter};\n`;
  }

  if (colors.shadowColorBrightAlt) {
    cssVars += `--mascot-${safeTheme}-shadow-color-bright-alt: ${colors.shadowColorBrightAlt};\n`;
  }

  if (animConfig) {
    if (animConfig.position) {
      cssVars += `--mascot-${safeTheme}-position-speed: ${animConfig.position.speed};\n`;
      cssVars += `--mascot-${safeTheme}-position-amplitude: ${animConfig.position.amplitude}%;\n`;
    }

    if (animConfig.stopPositions) {
      cssVars += `--mascot-${safeTheme}-stop-positions: "${animConfig.stopPositions.join(",")}";\n`;
    }
  }

  if (shapeConfig) {
    cssVars += `--mascot-${safeTheme}-flow-duration: ${shapeConfig.flowDuration}s;\n`;
    cssVars += `--mascot-${safeTheme}-flow-ease: ${shapeConfig.flowEase};\n`;

    if (shapeConfig.filter) {
      if (shapeConfig.filter.hueRotate) {
        cssVars += `--mascot-${safeTheme}-hue-rotate-min: ${shapeConfig.filter.hueRotate.min}deg;\n`;
        cssVars += `--mascot-${safeTheme}-hue-rotate-max: ${shapeConfig.filter.hueRotate.max}deg;\n`;

        if (shapeConfig.filter.hueRotate.isFullCycle) {
          cssVars += `--mascot-${safeTheme}-hue-rotate-full-cycle: true;\n`;
        }
      }

      if (shapeConfig.filter.saturate) {
        cssVars += `--mascot-${safeTheme}-saturate-min: ${shapeConfig.filter.saturate.min};\n`;
        cssVars += `--mascot-${safeTheme}-saturate-max: ${shapeConfig.filter.saturate.max};\n`;
      }

      if (shapeConfig.filter.brightness) {
        cssVars += `--mascot-${safeTheme}-brightness-min: ${shapeConfig.filter.brightness.min};\n`;
        cssVars += `--mascot-${safeTheme}-brightness-max: ${shapeConfig.filter.brightness.max};\n`;
      }
    }

    if (shapeConfig.scale) {
      cssVars += `--mascot-${safeTheme}-scale-min: ${shapeConfig.scale.min};\n`;
      cssVars += `--mascot-${safeTheme}-scale-mid: ${shapeConfig.scale.mid};\n`;
      cssVars += `--mascot-${safeTheme}-scale-steps: ${shapeConfig.scale.steps};\n`;
    }

    if (shapeConfig.rotation) {
      cssVars += `--mascot-${safeTheme}-rotation-min: ${shapeConfig.rotation.min}deg;\n`;
      cssVars += `--mascot-${safeTheme}-rotation-max: ${shapeConfig.rotation.max}deg;\n`;
    }

    if (shapeConfig.shadow) {
      cssVars += `--mascot-${safeTheme}-shadow-enabled: ${shapeConfig.shadow.enabled};\n`;
      cssVars += `--mascot-${safeTheme}-shadow-radius-min: ${shapeConfig.shadow.radius.min}px;\n`;
      cssVars += `--mascot-${safeTheme}-shadow-radius-max: ${shapeConfig.shadow.radius.max}px;\n`;
      cssVars += `--mascot-${safeTheme}-shadow-opacity-min: ${shapeConfig.shadow.opacity.min};\n`;
      cssVars += `--mascot-${safeTheme}-shadow-opacity-max: ${shapeConfig.shadow.opacity.max};\n`;
    }

    if (shapeConfig.transform && shapeConfig.transform.y) {
      cssVars += `--mascot-${safeTheme}-transform-y-min: ${shapeConfig.transform.y.min}px;\n`;
      cssVars += `--mascot-${safeTheme}-transform-y-max: ${shapeConfig.transform.y.max}px;\n`;
    }
  }

  return cssVars;
}

export function generateAllThemeCssVariables() {
  return (
    Object.keys(PALETTES)
      .map((themeName) => generateThemeCssVariables(themeName))
      .join("\n") + getGlobalAnimationVariables()
  );
}

const cssVariables = derived(
  theme,
  ($theme) =>
    `${generateThemeCssVariables($theme)}${getGlobalAnimationVariables()}`,
);

/**
 * Inject all theme CSS vars into a <style> in the document head. Call once on
 * mount (e.g. from the root layout). Returns a no-op cleanup.
 */
export function ensureMascotThemeStyles(options = {}) {
  if (!browser) return () => {};
  const { elementId = "mascot-theme-vars", target = document.head } = options;
  let styleElement = document.getElementById(elementId);
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = elementId;
    target.appendChild(styleElement);
  }

  styleElement.textContent = `:root {\n${generateAllThemeCssVariables()}\n}`;

  return () => {};
}

// Get a specific theme color (e.g. for gradientAnimator).
function getThemeColor(themeName, position, bright = false) {
  const colors = PALETTES[themeName];
  if (!colors) return null;

  const posKey = position.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const brightSuffix = bright ? "Bright" : "";
  const colorKey = posKey + brightSuffix;

  return colors[colorKey] || null;
}

export { theme, cssVariables, getThemeColor };
