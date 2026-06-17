<script>
  import { AppSuffix } from "$lib/components/ui";

  export let title = "DrShrink";
  export let subtitle = "Drop a file in, get a smaller one out. No settings, no fuss.";
  export let showAppSuffix = true;

  $: titleCharacters = Array.from(title);

  function getLetterDelay(index) {
    return `${0.05 + index * 0.05}s`;
  }
</script>

<div class="title-container relative">
  <h1
    class="staggered-text title-ink mb-1 cursor-default select-none text-center text-5xl font-black tracking-normal [font-feature-settings:'kern'_1] [font-kerning:normal] [font-variation-settings:'wght'_900,'opsz'_32] [letter-spacing:0] sm:text-6xl md:text-7xl"
    aria-label={title}
  >
    <span class="title-main-word">
      {#each titleCharacters as character, index}
        <span
          class="stagger-letter"
          style={`--letter-delay:${getLetterDelay(index)}`}
          aria-hidden="true">{character}</span
        >
      {/each}
    </span>

    {#if showAppSuffix}
      <span
        class="app-suffix-container stagger-letter relative"
        style={`--letter-delay:${getLetterDelay(titleCharacters.length)}`}
      >
        <span class="suffix-wrapper">
          <AppSuffix
            color="inherit"
            size="35%"
            offsetX="-0.6em"
            offsetY="8px"
            position="bottom-right"
            customClass="title-suffix"
          />
        </span>
      </span>
    {/if}
  </h1>
</div>

<p
  class="slide-in-subtitle mx-auto mb-6 mt-3 max-w-prose cursor-default select-none text-center text-base font-medium leading-relaxed tracking-normal text-gray-600 sm:mt-4 sm:text-lg"
>
  {subtitle}
</p>

<style>
  .staggered-text {
    opacity: 1;
    font-feature-settings: "kern" 1;
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .title-ink {
    color: var(--ds-primary-color, #9333ea);
  }

  .stagger-letter {
    display: inline-block;
    opacity: 0;
    transform: translateY(15px) translateZ(0);
    animation: staggerFadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    animation-delay: var(--letter-delay, 0s);
    will-change: transform, opacity;
    backface-visibility: hidden;
  }

  @keyframes staggerFadeIn {
    0% {
      opacity: 0;
      transform: translateY(15px) translateZ(0);
    }
    100% {
      opacity: 1;
      transform: translateY(0) translateZ(0);
    }
  }

  .slide-in-subtitle {
    opacity: 0;
    transform: translateY(10px);
    animation: slideIn 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    animation-delay: 0.6s;
    will-change: transform, opacity;
    backface-visibility: hidden;
    max-inline-size: 40ch;
    text-wrap: balance;
    line-height: 1.4;
  }

  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .title-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .title-main-word {
    display: inline-block;
    position: relative;
  }

  .app-suffix-container {
    display: inline-block;
    width: 0;
    height: 0;
    overflow: visible;
  }

  .suffix-wrapper {
    position: absolute;
    display: inline-block;
    bottom: 0;
    right: 0.25em;
    z-index: 1;
  }

  :global(.title-suffix) {
    letter-spacing: 0;
    font-variation-settings: inherit;
  }

  @media (max-width: 640px) {
    h1.staggered-text {
      font-size: 3rem;
      line-height: 1.1;
    }
    .suffix-wrapper {
      transform: scale(0.98);
    }
    .slide-in-subtitle {
      max-inline-size: 28ch;
      font-size: 1rem;
      line-height: 1.6;
    }
  }

  @media (max-width: 480px) {
    .suffix-wrapper {
      transform: scale(0.95);
      right: 0.05em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stagger-letter,
    .slide-in-subtitle {
      opacity: 1;
      transform: none;
      animation: none;
      will-change: auto;
    }
  }
</style>
