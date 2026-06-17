// DrShrink constants

export const THEMES = {
  VIBRANT: "vibrant", // purple→pink (default, the brain's colors)
  WARM: "warm", // sunset orange
  COOL: "cool", // mint/aqua
  MINIMAL: "minimal", // greyscale, calm
};

export const THEME_LIST = [
  { id: THEMES.VIBRANT, label: "Vibrant" },
  { id: THEMES.WARM, label: "Warm" },
  { id: THEMES.COOL, label: "Cool" },
  { id: THEMES.MINIMAL, label: "Minimal" },
];

export const DEFAULT_THEME = THEMES.VIBRANT;

export const STORAGE_KEYS = {
  THEME: "drshrink-theme",
};
