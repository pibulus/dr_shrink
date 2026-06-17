// ===================================================================
// PORTABLE MASCOT — public API
// ===================================================================
// Copy this whole folder into any SvelteKit app. It has zero imports outside
// itself except framework-provided ones (svelte, svelte/store, $app/environment).
// See README.md for the art-swap + theme-swap contract.

import Mascot from "./Mascot.svelte";
import DisplayMascot from "./DisplayMascot.svelte";
import GradientDefs from "./GradientDefs.svelte";

export { Mascot, DisplayMascot, GradientDefs };

// Theme API — define your palettes + drive the current theme.
export {
  defineMascotThemes,
  setTheme,
  theme,
  ensureMascotThemeStyles,
  getThemeNames,
  getThemeColor,
  FALLBACK_THEME,
} from "./mascotTheme.js";

// Accessory ("new hat") wardrobe.
export { ACCESSORIES, getAccessory, getAccessoryNames } from "./accessories.js";

// Character roster (swappable art).
export {
  CHARACTERS,
  getCharacterNames,
  getCharacterUrl,
} from "./characters.js";

export default Mascot;
