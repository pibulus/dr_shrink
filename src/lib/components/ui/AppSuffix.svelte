<script>
  /**
   * AppSuffix — the ".app" label tag beside the product name.
   * Reads the current theme from the <html data-theme> attribute so it recolors
   * with the app's theme (Phase C). Self-contained: no store import.
   */
  export let color = "inherit";
  export let size = "35%";
  export let customClass = "";
  export let offsetX = "-0.2em";
  export let offsetY = "6px";
  export let position = "bottom-right";
</script>

<span
  class="app-suffix {customClass} {position}"
  style="--suffix-color: {color}; --suffix-size: {size}; --offset-x: {offsetX}; --offset-y: {offsetY};"
  aria-hidden="true"
>
  <span class="app-text" data-text=".app">.app</span>
</span>

<style>
  .app-suffix {
    display: inline-block;
    color: var(--suffix-color, inherit);
    font-size: var(--suffix-size, 30%);
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
    font-kerning: normal;
    position: absolute;
    bottom: 0.15em;
    right: -0.35em;
    font-family: inherit;
    font-variation-settings: inherit;
    transform: translateY(var(--offset-y, 0));
    opacity: 0.95;
    z-index: 1;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.12));
  }

  .app-text {
    background-clip: text !important;
    -webkit-background-clip: text !important;
    color: transparent !important;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
    transition:
      filter 0.2s ease,
      transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    display: inline-block;
    position: relative;
    transform-origin: center;
    padding: 0.1em 0;
    /* GPU hints (canonical talktype/ziplist .app-text) */
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    /* tokenized gradient — per-theme token set in theme-variables.css;
       default (vibrant) = DrShrink purple→pink */
    background-image: var(
      --app-suffix-gradient,
      linear-gradient(to bottom right, #9333ea, #f472b6)
    );
  }

  .app-suffix:hover .app-text {
    filter: brightness(1.05) saturate(1.05);
    transform: rotate(-2deg) scale(1.05);
  }

  .bottom-right,
  .bottom-left {
    bottom: -0.92em;
  }
  .top-right,
  .top-left {
    top: -0.5em;
    bottom: auto;
  }
  .bottom-right,
  .top-right {
    right: var(--offset-x, -0.2em);
  }
  .bottom-left,
  .top-left {
    left: var(--offset-x, -0.2em);
    right: auto;
  }

  @media (max-width: 640px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.95);
    }
    .bottom-right,
    .bottom-left {
      bottom: -0.8em;
    }
  }

  @media (max-width: 480px) {
    .app-suffix {
      font-size: calc(var(--suffix-size) * 0.9);
    }

    .bottom-right,
    .bottom-left {
      bottom: -0.8em;
    }

    .top-right,
    .top-left {
      top: -0.48em;
    }
  }

  @media (min-width: 1024px) {
    .bottom-right,
    .bottom-left {
      bottom: -0.8em;
    }

    .top-right,
    .top-left {
      top: -0.52em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .app-suffix:hover,
    .app-suffix:hover .app-text {
      transform: none;
    }
  }
</style>
