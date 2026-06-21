<script>
  // IntroModal — first-visit welcome for DrShrink.
  // Self-contained (does NOT use the shared Modal.svelte, which the other
  // dialogs use) so it can carry the full shared intro SKELETON without
  // touching siblings: brain mascot slot, 44px circular X, warm-dark blurred
  // backdrop (tap-to-close), OPEN + CLOSE animation, and a mobile bottom-sheet
  // below 640px that becomes a centred card above it.
  // SKIN is pure DrShrink: cream gradient surface, --ds-* tokens, brain mascot,
  // on-voice copy.
  import { createEventDispatcher } from "svelte";
  import { Mascot } from "$lib/components/mascot";
  import { theme } from "$lib";

  export let open = false;

  const dispatch = createEventDispatcher();

  let closing = false; // held true while the out-animation plays
  let closeTimer = null;

  // CLOSE ANIMATION — flag a .closing state, wait for the transition, then unmount.
  // Honors prefers-reduced-motion by closing instantly.
  function close() {
    if (closing) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finishClose();
      return;
    }
    closing = true;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(finishClose, 220);
  }

  function finishClose() {
    closing = false;
    clearTimeout(closeTimer);
    dispatch("close");
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
  <div
    class="overlay"
    class:closing
    role="presentation"
    on:click={close}
  >
    <div
      class="box"
      class:closing
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <button class="x" type="button" on:click={close} aria-label="Close">×</button>

      <div class="mascot-slot" aria-hidden="true">
        <Mascot
          character="brain"
          theme={$theme}
          interactive={false}
          ariaLabel="DrShrink brain mascot"
        />
      </div>

      <h1 id="intro-title">
        Drop a file,<br />get a smaller one.
      </h1>

      <p class="lede">
        That's the whole thing. No settings, no sign-up, no upload — it all
        happens right here in your browser.
      </p>

      <ul class="beats">
        <li><span>⬩</span> Photos come back crisp and way lighter</li>
        <li><span>⬩</span> A pile of files becomes one tidy zip</li>
        <li><span>⬩</span> Audio shrinks to a lean little mp3</li>
      </ul>

      <p class="privacy">
        🔒 Your files never leave your device. Nothing is uploaded or kept.
      </p>

      <button class="cta" type="button" on:click={close}>
        Drop it. Shrink it. Done. 🩺
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Backdrop: warm-dark ~45% + blur, tap-to-close ── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end; /* mobile: dock to the bottom (bottom-sheet) */
    justify-content: center;
    background: rgba(20, 14, 10, 0.45);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    animation: overlayIn 0.18s ease-out;
  }
  .overlay.closing {
    animation: overlayOut 0.2s ease-in forwards;
  }

  /* ── Frame: DrShrink cream gradient skin on the shared skeleton ── */
  .box {
    position: relative;
    width: 100%;
    max-width: 420px;
    max-height: 92vh;
    overflow-y: auto;
    /* mobile bottom-sheet: full-width docked, rounded top, safe-area inset */
    border-radius: 24px 24px 0 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #fffaef, var(--ds-bg, #fff6e6));
    box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.22);
    padding: 2rem 1.5rem calc(1.6rem + env(safe-area-inset-bottom, 0px));
    animation: sheetIn 0.34s cubic-bezier(0.19, 1, 0.22, 1);
  }
  .box.closing {
    animation: sheetOut 0.2s ease-in forwards;
  }

  /* ── X button: 44px circular, top-right 1rem inset, scale-hover, focus ring ── */
  .x {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.05);
    font-size: 1.4rem;
    line-height: 1;
    color: #b3a99c;
    cursor: pointer;
    transition: transform 0.15s ease, color 0.15s ease, background 0.15s ease;
  }
  .x:hover {
    transform: scale(1.08);
    color: var(--ds-ink, #1f2937);
    background: rgba(0, 0, 0, 0.09);
  }
  .x:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 2px;
  }

  /* ── Mascot slot ── */
  .mascot-slot {
    width: 96px;
    height: 96px;
    margin: 0 auto 1.1rem;
    animation: floaty 3s ease-in-out infinite;
  }
  .mascot-slot :global(svg) {
    width: 100%;
    height: 100%;
  }

  /* ── Skin / copy ── */
  h1 {
    text-align: center;
    font-size: 1.55rem;
    font-weight: 900;
    letter-spacing: -0.01em;
    line-height: 1.15;
    color: var(--ds-ink, #1f2937);
    margin-bottom: 0.85rem;
  }
  .lede {
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.08);
    border: 1px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.18);
    padding: 0.85rem;
    border-radius: 12px;
    font-size: 0.95rem;
    line-height: 1.55;
    color: #4a4452;
    margin-bottom: 0.9rem;
  }
  .beats {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-size: 0.95rem;
    color: #4a4452;
    margin-bottom: 0.9rem;
  }
  .beats li {
    display: flex;
    gap: 0.5rem;
  }
  .beats span {
    color: var(--ds-accent-color, #c026d3);
  }
  .privacy {
    font-size: 0.85rem;
    color: #6b6671;
    margin-bottom: 1.1rem;
  }
  .cta {
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    border: none;
    font-size: 1.05rem;
    font-weight: 900;
    color: #fff;
    background: var(--app-suffix-gradient, linear-gradient(to bottom right, #9333ea, #f472b6));
    box-shadow: 0 6px 18px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.32);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .cta:hover {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow: 0 8px 22px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.4);
  }
  .cta:active {
    transform: translateY(0) scale(0.99);
  }
  .cta:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 2px;
  }

  /* ── Above 640px: centred card, all corners rounded, no safe-area inset ── */
  @media (min-width: 640px) {
    .overlay {
      align-items: center;
      padding: 1rem;
    }
    .box {
      border-radius: 24px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
      padding: 2.1rem 1.7rem 1.6rem;
      animation: cardIn 0.34s cubic-bezier(0.19, 1, 0.22, 1);
    }
    .box.closing {
      animation: cardOut 0.2s ease-in forwards;
    }
  }

  /* ── Animations ── */
  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes overlayOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  /* mobile: slide up from / down to the bottom edge */
  @keyframes sheetIn {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes sheetOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(100%); }
  }
  /* desktop: gentle rise + fade */
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes cardOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(8px) scale(0.97); }
  }
  @keyframes floaty {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  /* ── Reduced motion: instant, no float ── */
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .overlay.closing,
    .box,
    .box.closing,
    .mascot-slot {
      animation: none;
    }
  }
</style>
