# Portable Mascot

The SoftStack shared mascot — the full TalkType-ghost magic (cursor eye-tracking,
RAF-animated SVG gradient, daily personality/mood, animation state machine,
multi-pattern blink, easter eggs) in a **self-contained, copy-portable folder**.

Extracted from `talktype/src/lib/components/ghost/` (the upstream-of-record; this
copy is renamed `ghost → mascot` and decoupled). To re-sync upstream improvements,
`diff` against that folder.

## Portability contract

This folder imports **nothing outside itself** except framework-provided modules
(`svelte`, `svelte/store`, `$app/environment`). So:

```bash
cp -r src/lib/components/mascot /path/to/other-app/src/lib/components/
```

…and it works. No package, no app-specific services.

> ⚠️ **Single instance per page.** The state store + animation/blink/gradient
> services hold module-level state. Render one `<Mascot>` per page (it's a hero
> element). See the note in `stores/mascotState.js` to support multiple.

## Quick start

**1. Define your palettes + inject CSS vars once** (root `+layout.svelte`):

```svelte
<script>
  import { onMount } from "svelte";
  import { GradientDefs, defineMascotThemes, ensureMascotThemeStyles } from "$lib/components/mascot";

  const myThemes = {
    purple: {
      start: "#9333ea", startBright: "#a855f7",
      mid1: "#a855f7", mid1Bright: "#b565ff",
      mid2: "#c026d3", mid2Bright: "#d946ef",
      mid3: "#db2777", mid3Bright: "#ec4899",
      end: "#f472b6", endBright: "#f9a8d4",
      glowPrimary: "rgba(147,51,234,1)",
      glowSecondary: "rgba(192,38,211,0.9)",
      glowTertiary: "rgba(244,114,182,0.8)",
      shadowColor: "rgba(147,51,234,0.3)",
      shadowColorBright: "rgba(192,38,211,0.4)",
      shadowColorBrightest: "rgba(244,114,182,0.5)",
    },
  };

  defineMascotThemes(myThemes, { fallback: "purple" });
  onMount(() => ensureMascotThemeStyles());
</script>

<!-- one hidden <defs> with the gradients -->
<svg width="0" height="0" style="position:absolute"><defs><GradientDefs /></defs></svg>
<slot />
```

**2. Render the mascot**:

```svelte
<script>
  import { Mascot } from "$lib/components/mascot";
  let mascot;
  function onActivate() { /* your action */ }
</script>

<div style="width: 160px; height: 160px;">
  <Mascot bind:this={mascot} theme="purple" ariaLabel="Compress a file" on:activate={onActivate} />
</div>
```

## Props

| Prop                               | Default               | Notes                                                 |
| ---------------------------------- | --------------------- | ----------------------------------------------------- |
| `theme`/`externalTheme`            | fallback              | theme name string, OR a `subscribe`-able store        |
| `active`                           | `false`               | sustained engaged state (was `isRecording`)           |
| `busy`                             | `false`               | transient working state (was `isProcessing`)          |
| `paused`                           | `false`               | pause all animation (app drives blur/offscreen)       |
| `interactive`                      | `true`                | render as `<button>` (emits `activate`) vs decorative |
| `ariaLabel`                        | `"Mascot"`            | accessible label for the button                       |
| `seed`                             | `0`                   | daily personality seed                                |
| `width`/`height`/`scale`/`opacity` | `100%`/`100%`/`1`/`1` | sizing on the container                               |
| `debug`/`debugAnim`                | `false`               | dev visualisation                                     |

**Events:** `on:activate` (interactive click/Enter/Space).

**Methods** (via `bind:this`): `pulse()`, `startThinking()`, `stopThinking()`,
`react(intensity)`. Map to your app's states — `startThinking()` while compressing,
`react(bytesSaved)` on done.

## Swapping the art

Edit `mascot-paths.svg` — a hidden path library referenced by `<use href>`.
Required path IDs (single shared viewBox, default `0 0 1024 1024`):

| ID                       | Role                                              |
| ------------------------ | ------------------------------------------------- |
| `#mascot-body-path`      | outline / silhouette, filled black                |
| `#mascot-background`     | **same** silhouette, gradient-filled, behind body |
| `#mascot-eye-left-path`  | left eye (separate path → translates + blinks)    |
| `#mascot-eye-right-path` | right eye (separate path)                         |

Eyes MUST be separate paths for tracking + blink. Body + background are the same
outline (black on top, gradient behind) — that's the signature look.

To turn a PNG into this: trace the outer silhouette → `#mascot-body-path` +
`#mascot-background`; the engine supplies the eyes (place them over the silhouette).

## Accessories ("new hat", à la Malibu Stacey)

Modular hats/patches layered on top of any mascot. The `accessory` prop picks an
entry from `accessories.js`; each is SVG markup authored in the same 1024 viewBox,
rendered in a layer above the body but inside the wobble group (so it rides the
float/wobble/spin).

```svelte
<Mascot theme="purple" accessory="pirate-patch" />
```

Built-in: `none`, `pirate-patch`, `top-hat`, `party-hat`, `head-mirror`. Add your
own by appending to `ACCESSORIES` in `accessories.js` (draw in 1024 space; hats sit
around y≈120–340, centered x≈512). Use `accessoryOffsetY` to nudge per-mascot if a
character's head sits higher/lower. An accessory can also declare a `personality`
to tweak the mascot's mood when worn.
