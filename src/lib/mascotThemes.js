// DrShrink mascot palettes — keyed to match the app themes (constants THEMES),
// so the brain recolors when the theme switches.

export const drShrinkThemes = {
  vibrant: {
    start: "#7c3aed", startBright: "#8b5cf6",
    mid1: "#9333ea", mid1Bright: "#a855f7",
    mid2: "#c026d3", mid2Bright: "#d946ef",
    mid3: "#db2777", mid3Bright: "#ec4899",
    end: "#f472b6", endBright: "#f9a8d4",
    glowPrimary: "rgba(124,58,237,1)", glowSecondary: "rgba(192,38,211,0.9)", glowTertiary: "rgba(244,114,182,0.8)",
    shadowColor: "rgba(124,58,237,0.3)", shadowColorBright: "rgba(192,38,211,0.4)", shadowColorBrightest: "rgba(244,114,182,0.5)",
  },
  warm: {
    start: "#ff6a3d", startBright: "#ff8159",
    mid1: "#ff7e5f", mid1Bright: "#ff9472",
    mid2: "#ff9a52", mid2Bright: "#ffb070",
    mid3: "#ffb347", mid3Bright: "#ffc266",
    end: "#ffd24c", endBright: "#ffe27a",
    glowPrimary: "rgba(255,106,61,1)", glowSecondary: "rgba(255,154,82,0.9)", glowTertiary: "rgba(255,210,76,0.8)",
    shadowColor: "rgba(255,140,90,0.3)", shadowColorBright: "rgba(255,170,110,0.4)", shadowColorBrightest: "rgba(255,210,150,0.5)",
  },
  cool: {
    start: "#0ac5ef", startBright: "#20d0fa",
    mid1: "#16cdd6", mid1Bright: "#30dfe4",
    mid2: "#1fd4bf", mid2Bright: "#38e0cc",
    mid3: "#2fd98a", mid3Bright: "#48e89c",
    end: "#5fe07a", endBright: "#7aec92",
    glowPrimary: "rgba(15,181,201,1)", glowSecondary: "rgba(31,212,191,0.9)", glowTertiary: "rgba(95,224,122,0.8)",
    shadowColor: "rgba(20,184,166,0.3)", shadowColorBright: "rgba(40,210,190,0.4)", shadowColorBrightest: "rgba(95,224,150,0.5)",
  },
  minimal: {
    start: "#6b7280", startBright: "#7b828e",
    mid1: "#71717a", mid1Bright: "#82828b",
    mid2: "#808089", mid2Bright: "#90909a",
    mid3: "#8e8e98", mid3Bright: "#9e9ea8",
    end: "#a1a1aa", endBright: "#b4b4bd",
    glowPrimary: "rgba(82,82,91,0.9)", glowSecondary: "rgba(113,113,122,0.8)", glowTertiary: "rgba(161,161,170,0.7)",
    shadowColor: "rgba(82,82,91,0.25)", shadowColorBright: "rgba(113,113,122,0.3)", shadowColorBrightest: "rgba(161,161,170,0.35)",
  },
};
