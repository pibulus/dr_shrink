<script>
  import { AppSuffix } from "$lib/components/ui";

  export let title = "DrShrink";
  export let subtitle =
    "Drop a file in, get a smaller one out. No settings, no fuss.";
  export let showAppSuffix = true;

  $: titleCharacters = Array.from(title);

  function getLetterDelay(index) {
    return `${0.05 + index * 0.05}s`;
  }
</script>

<div class="title-container relative">
  <h1
    class="staggered-text title-ink mb-1 cursor-default select-none text-center text-[clamp(3rem,9vmin_+_1.1rem,8rem)] font-black tracking-normal [font-feature-settings:'kern'_1] [font-kerning:normal] [font-variation-settings:'wght'_900,'opsz'_32] [letter-spacing:0]"
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
            offsetY="0px"
            position="bottom-right"
            customClass="title-suffix"
          />
        </span>
      </span>
    {/if}
  </h1>
</div>

<p
  class="slide-in-subtitle mx-auto mb-6 mt-3 max-w-prose cursor-default select-none text-center text-sm font-medium leading-relaxed tracking-normal text-gray-600 sm:mb-7 sm:mt-6 sm:text-lg sm:font-normal sm:text-gray-700/85 md:text-xl lg:text-2xl"
>
  {subtitle}
</p>

<style>
  /* 1.1, not the inherited 1.5: a 90px word in a 135px box reads as a loose
     gap to both the mascot and the subtitle. 1.1 still clears descenders and
     the .app suffix, which rides inside the h1. (TalkType parity.) */
  .staggered-text {
    line-height: 1.1;
    opacity: 1;
    font-feature-settings: "kern" 1;
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .title-ink {
    color: var(--ds-ink, #1f2937);
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

  /* Short-viewport ramp. These DEGRADE FROM the TalkType geometry above; they
     must never fire on a normal 1280×800 / 1440×900 desktop (the old 900px
     threshold did, shrinking the whole hero and leaving ~300px of dead space
     under the drop zone). Thresholds mirror TalkType's mascot ramp (820/650)
     with one middle step for squat laptops (1280×720, 1366×768). */
  @media (min-width: 768px) and (max-height: 780px) {
    .slide-in-subtitle {
      margin-top: 0.75rem;
      margin-bottom: 1rem;
      font-size: 1.15rem;
    }
  }
  @media (min-width: 768px) and (max-height: 740px) {
    h1.staggered-text {
      font-size: 4.5rem;
    }
    .slide-in-subtitle {
      margin-top: 0.5rem;
      margin-bottom: 0.75rem;
    }
  }
  @media (min-width: 768px) and (max-height: 650px) {
    h1.staggered-text {
      font-size: 3.5rem;
    }
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
  @media (max-width: 640px) and (max-height: 740px) {
    .slide-in-subtitle {
      margin-top: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.95rem;
      line-height: 1.4;
    }
  }
  @media (max-width: 640px) and (max-height: 600px) {
    h1.staggered-text {
      font-size: 2.6rem;
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
