// ===================================================================
// MASCOT ACCESSORIES — the "new hat" wardrobe (à la Malibu Stacey)
// ===================================================================
//
// Each accessory is SVG markup authored in the SAME 0 0 1024 1024 viewBox as the
// mascot art, so it lands in the right spot on any character. Accessories render
// in a layer ABOVE the body but INSIDE the wobble group, so they ride the
// float/wobble/spin with the mascot.
//
// Modular: any mascot + any accessory. To add one, drop a new entry here whose
// `svg` draws in the 1024 space (hats sit around y≈120–340, centered on x≈512).
//
// `anchorY` (optional) nudges the accessory vertically per-mascot if a character's
// head sits higher/lower; default 0. `personality` optionally tweaks the mascot's
// default mood when this accessory is worn.

export const ACCESSORIES = {
  none: {
    label: "No hat",
    svg: "",
  },

  // Pirate eye-patch — a strap across + a patch over the left eye region.
  "pirate-patch": {
    label: "Pirate patch",
    personality: "spry",
    svg: `
      <path d="M 300 470 Q 512 430 724 470" fill="none" stroke="#0e1512" stroke-width="26" stroke-linecap="round"/>
      <ellipse cx="430" cy="540" rx="78" ry="92" fill="#0e1512"/>
      <ellipse cx="430" cy="540" rx="58" ry="72" fill="#1b1b1b"/>
    `,
  },

  // Top hat — chunky neo-brutalist black with a band.
  "top-hat": {
    label: "Top hat",
    personality: "drift",
    svg: `
      <g stroke="#0e1512" stroke-width="20" stroke-linejoin="round">
        <rect x="300" y="120" width="424" height="80" rx="14" fill="#1b1b1b"/>
        <rect x="360" y="-20" width="304" height="170" rx="18" fill="#1b1b1b"/>
        <rect x="360" y="95" width="304" height="40" fill="#c026d3" stroke="none"/>
      </g>
    `,
  },

  // Party hat — cone with a pom-pom.
  "party-hat": {
    label: "Party hat",
    personality: "loopy",
    svg: `
      <g stroke="#0e1512" stroke-width="20" stroke-linejoin="round">
        <polygon points="512,-30 612,180 412,180" fill="#ffcf40"/>
        <circle cx="512" cy="-30" r="34" fill="#ff6ac2"/>
        <circle cx="470" cy="120" r="14" fill="#71c9ce" stroke="none"/>
        <circle cx="552" cy="90" r="14" fill="#ff6ac2" stroke="none"/>
      </g>
    `,
  },

  // Doctor's head-mirror — DrShrink's signature, as a swappable accessory.
  // (The brain art already includes it; this is here so other mascots can wear it.)
  "head-mirror": {
    label: "Head mirror",
    personality: "drift",
    svg: `
      <g stroke="#0e1512" stroke-width="22">
        <path d="M 380 300 Q 560 250 690 300" fill="none" stroke-width="26" stroke-linecap="round"/>
        <circle cx="700" cy="300" r="86" fill="#d9d9d9"/>
        <circle cx="700" cy="300" r="30" fill="#0e1512" stroke="none"/>
      </g>
    `,
  },
};

/** List accessory names for pickers. */
export function getAccessoryNames() {
  return Object.keys(ACCESSORIES);
}

/** Resolve an accessory by name (falls back to none). */
export function getAccessory(name) {
  return ACCESSORIES[name] || ACCESSORIES.none;
}
