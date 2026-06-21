<script>
  import { createEventDispatcher } from "svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";

  export let open = false;

  const dispatch = createEventDispatcher();

  // SKELETON: close-out animation — hold a `closing` flag so the panel stays
  // mounted through the exit transition, then unmount + dispatch. Honors
  // prefers-reduced-motion (instant close, no timeout) via the media query.
  let closing = false;
  let prefersReduced = false;
  if (typeof window !== "undefined" && window.matchMedia) {
    prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function close() {
    if (closing) return;
    if (prefersReduced) {
      dispatch("close");
      return;
    }
    closing = true;
    setTimeout(() => {
      closing = false;
      dispatch("close");
    }, 240);
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
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
      aria-labelledby="about-title"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <button class="x" on:click={close} aria-label="Close">×</button>

      <header class="head">
        <span class="ico" aria-hidden="true">
          <ThemeMascot theme={$theme} size="30px" />
        </span>
        <h2 id="about-title">The shrink-anything thing</h2>
      </header>

      <div class="body space-y-4">
        <p class="lede">
          DrShrink takes the thing you drop and hands back something smaller and more
          useful. No settings, no sign-up, no upload — it all happens right here in
          your browser.
        </p>

        <h4>What it does:</h4>
        <ul class="list">
          <li><span>⬩</span> Photos → crisp, way smaller</li>
          <li><span>⬩</span> A pile of files → one tidy zip</li>
          <li><span>⬩</span> Audio → a lean little mp3</li>
          <li><span>⬩</span> Docs &amp; text → stripped and squeezed</li>
        </ul>

        <p class="quote">"Drop it. Shrink it. Done."</p>

        <p class="privacy">
          🔒 Your files never leave your device. Nothing is uploaded, logged, or kept.
        </p>

        <!-- SKELETON link set 4/4: mascot icon + GitHub (bare profile) + Ko-fi + privacy one-liner -->
        <div class="links">
          <a
            class="link-icon"
            href="https://github.com/pibulus"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pablo's mascot — see more on GitHub"
          >
            <ThemeMascot theme={$theme} size="24px" />
          </a>
          <a
            href="https://github.com/pibulus"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pablo on GitHub"
          >
            🐙 GitHub
          </a>
          <a
            href="https://ko-fi.com/madebypablo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support on Ko-fi"
          >
            ☕ Coffee jar
          </a>
        </div>

        <div class="foot">
          <span>Melbourne, Australia</span>
          <span>Pablo</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── SKELETON: backdrop — warm-dark ~45% + blur, tap-to-close ── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(20, 14, 10, 0.45);
    backdrop-filter: blur(2.5px);
    animation: ds-fade 0.18s ease-out;
  }
  .overlay.closing {
    animation: ds-fade-out 0.22s ease-in forwards;
  }

  /* ── SKELETON: frame — centered card, max-width 380px, radius 24px ── */
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
    animation: ds-pop-up 0.32s cubic-bezier(0.19, 1, 0.22, 1);
  }
  .box.closing {
    animation: ds-pop-down 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  /* ── SKELETON: X button — 44px circular, top-right 1rem, scale-hover, focus ring ── */
  .x {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    font-size: 1.5rem;
    line-height: 1;
    color: #b3a99c;
    background: transparent;
    transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease;
  }
  .x:hover {
    color: var(--ds-ink, #1f2937);
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.08);
    transform: scale(1.08);
  }
  .x:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 2px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
    padding-right: 2.5rem;
  }
  .ico {
    display: inline-flex;
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

  /* SKELETON: spacing rhythm 3 → 4 */
  .space-y-4 > * + * { margin-top: 1rem; }

  .lede {
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.08);
    border: 1px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.18);
    padding: 0.85rem;
    border-radius: 12px;
  }
  h4 {
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--ds-ink, #1f2937);
  }
  .list { display: flex; flex-direction: column; gap: 0.35rem; }
  .list li { display: flex; gap: 0.5rem; }
  .list span { color: var(--ds-accent-color, #c026d3); }
  .quote {
    border-left: 3px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.4);
    padding-left: 0.9rem;
    font-style: italic;
    color: #6b6671;
  }
  .privacy { font-size: 0.85rem; color: #6b6671; }

  /* ── SKELETON link set: ~44px tap targets ── */
  .links {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
  }
  .links a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 44px;
    color: var(--ds-accent-color, #c026d3);
    font-weight: 600;
  }
  .links a:hover { text-decoration: underline; }
  .links a:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .link-icon {
    width: 44px;
    min-width: 44px;
    justify-content: center;
    transition: transform 0.15s ease;
  }
  .link-icon:hover { transform: scale(1.1); text-decoration: none; }

  .foot {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #9b9199;
    padding-top: 0.3rem;
  }

  /* ── SKELETON: mobile bottom-sheet below 640px ── */
  @media (max-width: 639px) {
    .overlay {
      align-items: flex-end;
      padding: 0;
    }
    .box {
      max-width: 100%;
      max-height: 90dvh;
      border-radius: 24px 24px 0 0;
      border-bottom: 0;
      padding-bottom: calc(1.35rem + env(safe-area-inset-bottom, 0px));
      animation: ds-sheet-up 0.36s cubic-bezier(0.18, 0.92, 0.2, 1.08);
    }
    .box.closing {
      animation: ds-sheet-down 0.24s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  }

  @keyframes ds-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ds-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes ds-pop-up {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ds-pop-down {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(8px) scale(0.98); }
  }
  @keyframes ds-sheet-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ds-sheet-down {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(100%); }
  }

  /* SKELETON: prefers-reduced-motion — instant, no transitions */
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .overlay.closing,
    .box,
    .box.closing {
      animation: none !important;
    }
  }
</style>
