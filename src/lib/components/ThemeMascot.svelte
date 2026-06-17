<!--
  ThemeMascot — a tiny brain mascot rendered in a given DrShrink theme's
  gradient, for the theme picker tiles (à la TalkType's ghost vibe swatches).
  Uses the real brain silhouette + outline + eyes, filled with that theme's
  palette. Self-contained, no store; the gradient id is unique per (theme,uid).
-->
<script>
  import brainUrl from "$lib/components/mascot/art/brain.svg?url";
  import { drShrinkThemes } from "$lib/mascotThemes.js";

  export let theme = "vibrant";
  export let size = "44px";

  // unique gradient id so multiple tiles don't collide
  const uid = Math.random().toString(36).slice(2, 8);
  $: pal = drShrinkThemes[theme] || drShrinkThemes.vibrant;
  $: gid = `tm-${theme}-${uid}`;
</script>

<svg
  viewBox="0 0 1024 1024"
  width={size}
  height={size}
  class="theme-mascot"
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color={pal.start} />
      <stop offset="45%" stop-color={pal.mid2} />
      <stop offset="100%" stop-color={pal.end} />
    </linearGradient>
  </defs>
  <use href={brainUrl + "#mascot-background"} fill="url(#{gid})" />
  <use href={brainUrl + "#mascot-body-path"} fill="#000" />
  <use href={brainUrl + "#mascot-eye-left-path"} fill="#000" />
  <use href={brainUrl + "#mascot-eye-right-path"} fill="#000" />
</svg>

<style>
  .theme-mascot {
    display: block;
    overflow: visible;
  }
</style>
