<script>
  // Generic Toybrut modal shell. Classes live in app.css (the ds- kit) so
  // Intro / About / Options / Passport share one look. Architecture is the
  // family's "local wrapper + closing flag" lane: the page owns the body
  // scroll-lock via its show* flags; this component only animates and
  // dispatches close.
  import { createEventDispatcher } from "svelte";
  import { dialogFocus } from "$lib/services/dialogFocus.js";

  export let open = false;
  export let title = "";
  export let icon = ""; // emoji or short string (or use the icon slot)
  export let size = "md"; // sm | md | lg
  export let pitch = false; // pitch siblings render their own hero, no header
  export let labelledBy = ""; // id of the heading when pitch=true

  const dispatch = createEventDispatcher();

  let closing = false;
  let closeTimer = null;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  export function close() {
    if (closing) return;
    if (prefersReducedMotion()) {
      dispatch("close");
      return;
    }
    closing = true;
    clearTimeout(closeTimer);
    // Matches --ds-modal-close-ms in app.css.
    closeTimer = setTimeout(() => {
      closing = false;
      dispatch("close");
    }, 150);
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }
</script>

<svelte:window on:keydown={open ? onKeydown : undefined} />

{#if open}
  <div class="ds-overlay" class:closing role="presentation" on:click={close}>
    <div
      use:dialogFocus
      class="ds-modal-box {size}"
      class:is-pitch={pitch}
      role="dialog"
      aria-modal="true"
      aria-label={pitch ? undefined : title}
      aria-labelledby={pitch && labelledBy ? labelledBy : undefined}
      tabindex="-1"
      on:click|stopPropagation
      on:keydown={onKeydown}
    >
      <button class="ds-close" type="button" on:click={close} aria-label="Close">
        <!-- Drawn, not typed: a × glyph sits wherever its font puts it. -->
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3.25"
          stroke-linecap="round"
          aria-hidden="true"><path d="M6.5 6.5l11 11m0-11l-11 11" /></svg
        >
      </button>

      {#if !pitch && title}
        <header class="head">
          {#if $$slots.icon}
            <span class="ico" aria-hidden="true"><slot name="icon" /></span>
          {:else if icon}
            <span class="ico" aria-hidden="true">{icon}</span>
          {/if}
          <h2>{title}</h2>
        </header>
      {/if}

      <div class="body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .head {
    padding-right: 3rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .ico {
    display: inline-flex;
    font-size: 1.5rem;
    line-height: 0;
  }
  .head h2 {
    font-size: 1.3rem;
    font-weight: 900;
    letter-spacing: -0.01em;
    color: var(--ds-ink-deep, #1e1714);
  }
  .body {
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .is-pitch .body {
    padding-top: 0.25rem;
  }
</style>
