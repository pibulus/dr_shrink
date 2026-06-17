// ===================================================================
// MASCOT CHARACTERS — swappable art (the icon-factory roster)
// ===================================================================
//
// Each character is an SVG path-library in art/<name>.svg with the four required
// IDs (#mascot-body-path, #mascot-background, #mascot-eye-left-path,
// #mascot-eye-right-path), all authored in the 0 0 1024 1024 viewBox.
//
// Vite resolves every art/*.svg to a URL at build time; this maps friendly names
// to those URLs so <Mascot character="ghost"> just works.

const artUrls = import.meta.glob("./art/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
});

/** name -> resolved url, e.g. { brain: '/.../brain.svg', ghost: '...' } */
export const CHARACTERS = Object.fromEntries(
  Object.entries(artUrls).map(([path, url]) => [
    path.replace("./art/", "").replace(".svg", ""),
    url,
  ]),
);

export function getCharacterNames() {
  return Object.keys(CHARACTERS);
}

/** Resolve a character art URL by name (falls back to the first available). */
export function getCharacterUrl(name) {
  return CHARACTERS[name] || Object.values(CHARACTERS)[0];
}
