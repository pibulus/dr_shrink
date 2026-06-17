// ===================================================================
// MASCOT ACCESSORIES — the "new hat" wardrobe (à la Malibu Stacey)
// ===================================================================
//
// Each accessory is SVG markup authored in the SAME 0 0 1024 1024 viewBox as the
// mascot art, so it lands in the right spot on any character. Accessories render
// in a layer ABOVE the body but INSIDE the wobble group, so they ride the
// float/wobble/spin with the mascot.
//
// Coordinate cheat-sheet (1024 viewBox, art centered ~512,512):
//   - hats / things on top of the head: y ≈ -40 … 240, x centered ~512
//   - things over an eye (patch/monocle): eyes sit ~ (430,540) and (600,540)
//   - things below the face (moustache): y ≈ 600 … 720
//
// Modular: any mascot + any accessory. To add one, append an entry whose `svg`
// draws in the 1024 space. `personality` optionally tweaks the mascot's mood
// when worn. Per-mascot vertical placement is handled by the component's
// `accessoryOffsetY` prop.

const INK = "#0e1512"; // shared neo-brutalist outline ink

export const ACCESSORIES = {
  none: {
    label: "No hat",
    svg: "",
  },

  // Pirate eye-patch — solid patch over the left eye + strap up to the right side.
  "pirate-patch": {
    label: "Pirate patch",
    personality: "spry",
    svg: `
      <g stroke="${INK}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
        <!-- strap from above-left, across, to the right side of the head -->
        <path d="M 360 360 L 470 520 M 470 520 L 760 430" fill="none" stroke-width="22"/>
        <!-- the patch: a solid rounded square covering the left eye fully -->
        <path d="M 388 480
                 q 0 -22 22 -22 l 120 0 q 22 0 22 22 l 0 96
                 q 0 30 -28 40 l -56 20 q -24 8 -48 0 l -28 -12
                 q -26 -10 -26 -40 z" fill="${INK}"/>
      </g>
    `,
  },

  // Top hat — chunky neo-brutalist black with a magenta band.
  "top-hat": {
    label: "Top hat",
    personality: "drift",
    svg: `
      <g stroke="${INK}" stroke-width="20" stroke-linejoin="round">
        <rect x="288" y="118" width="448" height="74" rx="14" fill="#1b1b1b"/>
        <rect x="356" y="-30" width="312" height="172" rx="18" fill="#1b1b1b"/>
        <rect x="356" y="92" width="312" height="42" fill="#c026d3" stroke="none"/>
      </g>
    `,
  },

  // Party hat — bigger cone with stripes + a pom-pom.
  "party-hat": {
    label: "Party hat",
    personality: "loopy",
    svg: `
      <g stroke="${INK}" stroke-width="22" stroke-linejoin="round">
        <polygon points="512,-90 648,210 376,210" fill="#ffcf40"/>
        <path d="M 460 40 L 540 40 M 430 130 L 575 130" stroke="#ff6ac2" stroke-width="26" fill="none"/>
        <circle cx="512" cy="-90" r="42" fill="#ff6ac2"/>
      </g>
    `,
  },

  // Cowboy hat — yeehaw. Wide curled brim + crown.
  "cowboy-hat": {
    label: "Cowboy hat",
    personality: "spry",
    svg: `
      <g stroke="${INK}" stroke-width="20" stroke-linejoin="round">
        <path d="M 230 175 Q 512 120 794 175 Q 720 250 512 250 Q 304 250 230 175 Z" fill="#8a5a2b"/>
        <path d="M 360 180 Q 380 30 512 30 Q 644 30 664 180 Z" fill="#a06a35"/>
        <rect x="360" y="150" width="304" height="34" rx="8" fill="#5c3a1a" stroke="none"/>
      </g>
    `,
  },

  // Sombrero — huge wide brim, festive.
  sombrero: {
    label: "Sombrero",
    personality: "loopy",
    svg: `
      <g stroke="${INK}" stroke-width="20" stroke-linejoin="round">
        <ellipse cx="512" cy="200" rx="330" ry="80" fill="#e0a93b"/>
        <path d="M 380 200 Q 400 20 512 20 Q 624 20 644 200 Z" fill="#edbd55"/>
        <ellipse cx="512" cy="190" rx="132" ry="26" fill="#c0392b" stroke="none"/>
        <path d="M 210 205 Q 512 250 814 205" fill="none" stroke="#c0392b" stroke-width="14"/>
      </g>
    `,
  },

  // Beanie — slouchy knit cap with a pom.
  beanie: {
    label: "Beanie",
    personality: "drift",
    svg: `
      <g stroke="${INK}" stroke-width="20" stroke-linejoin="round">
        <path d="M 320 200 Q 320 60 512 60 Q 704 60 704 200 Z" fill="#71c9ce"/>
        <rect x="300" y="188" width="424" height="46" rx="22" fill="#5bb3b8"/>
        <circle cx="512" cy="52" r="30" fill="#ffffff"/>
      </g>
    `,
  },

  // Pipe — classy smoker, sits at the lower-right of the face.
  pipe: {
    label: "Pipe",
    personality: "drift",
    svg: `
      <g stroke="${INK}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round">
        <path d="M 600 660 L 760 660 Q 800 660 800 700 L 800 720 Q 800 770 750 770 L 700 770 Q 640 770 620 720 Z" fill="#6b3f1d"/>
        <path d="M 600 660 L 470 690" fill="none" stroke-width="22"/>
        <!-- smoke puffs -->
        <circle cx="820" cy="600" r="16" fill="#cfcfcf" stroke-width="10"/>
        <circle cx="855" cy="540" r="22" fill="#dcdcdc" stroke-width="10"/>
      </g>
    `,
  },

  // Moustache — curly handlebar under the eyes.
  moustache: {
    label: "Moustache",
    personality: "spry",
    svg: `
      <g fill="${INK}" stroke="${INK}" stroke-width="6" stroke-linejoin="round">
        <path d="M 512 640
                 Q 470 660 430 655 Q 360 648 340 600 Q 332 632 360 660
                 Q 410 696 470 678 Q 500 668 512 648 Z"/>
        <path d="M 512 640
                 Q 554 660 594 655 Q 664 648 684 600 Q 692 632 664 660
                 Q 614 696 554 678 Q 524 668 512 648 Z"/>
      </g>
    `,
  },

  // Monocle — over the right eye, with a dangling chain.
  monocle: {
    label: "Monocle",
    personality: "drift",
    svg: `
      <g stroke="${INK}" stroke-width="16" fill="none">
        <circle cx="600" cy="540" r="92" fill="rgba(255,255,255,0.18)"/>
        <path d="M 690 560 Q 720 660 660 720" stroke-width="10"/>
      </g>
    `,
  },

  // Doctor's head-mirror — DrShrink's signature, as a swappable accessory.
  "head-mirror": {
    label: "Head mirror",
    personality: "drift",
    svg: `
      <g stroke="${INK}" stroke-width="22">
        <path d="M 380 300 Q 560 250 690 300" fill="none" stroke-width="26" stroke-linecap="round"/>
        <circle cx="700" cy="300" r="86" fill="#d9d9d9"/>
        <circle cx="700" cy="300" r="30" fill="${INK}" stroke="none"/>
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
