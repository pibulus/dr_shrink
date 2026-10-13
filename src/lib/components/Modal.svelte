<script>
  import { createEventDispatcher } from "svelte";
  import { dialogFocus } from "$lib/services/dialogFocus.js";

  export let open = false;
  export let title = "";
  export let icon = ""; // emoji or short string

  const dispatch = createEventDispatcher();

  let closing = false;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Close-out animation: hold a closing flag, then dispatch after the exit
  // anim finishes (instant when reduced-motion is requested). Matches the
  // family pattern in corruptor/cryptkeep.
  function close() {
    if (closing) return;
    if (prefersReducedMotion()) {
      dispatch("close");
      return;
    }
    closing = true;
    // Matches the 180ms close animation in this file's style block.
    setTimeout(() => {
      closing = false;
      dispatch("close");
    }, 180);
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window on:keydown={open ? onKeydown : undefined} />

{#if open}
  <div class="overlay" class:closing role="presentation" on:click={close}>
    <div
      use:dialogFocus
      class="box"
      class:closing
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      on:click|stopPropagation
      on:keydown={onKeydown}
    >
      <button class="x" on:click={close} aria-label="Close">×</button>

      {#if title}
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
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(20, 14, 10, 0.42);
    backdrop-filter: blur(3px);
    animation: fade 0.18s ease-out;
  }
  .overlay.closing {
    animation: fadeOut 0.18s ease-out forwards;
  }
  .box {
    width: 100%;
    max-width: 380px;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    border-radius: 24px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #fffaef, var(--ds-bg, #fff6e6));
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
    padding: 1.6rem 1.5rem 1.35rem;
    animation: fadeUp 0.28s cubic-bezier(0.16, 0.84, 0.24, 1.06);
  }
  .box.closing {
    animation: fadeDown 0.18s cubic-bezier(0.4, 0, 0.24, 1) forwards;
  }
  .x {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    position: absolute;
    top: 0.7rem;
    right: 1rem;
    font-size: 1.5rem;
    line-height: 1;
    color: #b3a99c;
    transition: color 0.15s ease;
  }
  .x:hover {
    color: var(--ds-ink, #1f2937);
  }
  .head {
    padding-right: 2.5rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .ico {
    font-size: 1.5rem;
  }
  .head h2 {
    font-size: 1.3rem;
    font-weight: 900;
    letter-spacing: -0.01em;
    color: var(--ds-ink, #1f2937);
  }
  .body {
    color: #4a4452;
    font-size: 0.95rem;
    line-height: 1.55;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes fadeDown {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(8px) scale(0.97);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .overlay.closing,
    .box,
    .box.closing {
      animation: none;
    }
  }
</style>
