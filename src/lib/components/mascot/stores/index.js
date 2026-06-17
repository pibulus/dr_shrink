/**
 * Mascot Animation Stores
 *
 * Central export point for all mascot animation stores
 */

// Export the main state store instance (which now includes derived stores)
export { mascotState } from "./mascotState.js";

// Export the main theme store instance and related functions/values
export {
  theme,
  cssVariables,
  setTheme,
  getThemeColor,
  FALLBACK_THEME,
  defineMascotThemes,
  ensureMascotThemeStyles,
  getThemeNames,
} from "../mascotTheme.js";

// Consumers can access derived stores via mascotState.currentState, mascotState.isRecording etc.
// or use $mascotState.current, $mascotState.isRecording etc.
