<script>
  import "../app.css";
  import { onMount } from "svelte";
  import {
    GradientDefs,
    defineMascotThemes,
    ensureMascotThemeStyles,
  } from "$lib/components/mascot";
  import { drShrinkThemes } from "$lib/mascotThemes.js";

  // Register DrShrink's mascot palette (rebuilds the gradient defs).
  defineMascotThemes(drShrinkThemes, { fallback: "purple" });

  onMount(() => {
    // Inject the --mascot-* CSS vars so gradients resolve + animate.
    ensureMascotThemeStyles();
  });
</script>

<!-- Hidden gradient defs, shared by all mascot instances. -->
<svg width="0" height="0" style="position: absolute" aria-hidden="true">
  <defs>
    <GradientDefs />
  </defs>
</svg>

<slot />
