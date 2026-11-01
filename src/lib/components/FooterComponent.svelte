<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import { isSupporter } from "$lib/services/supporterService.js";

  const dispatch = createEventDispatcher();
  const btn =
    "footer-nav-button btn btn-ghost btn-sm !h-[44px] !min-h-[44px] min-w-11 px-1.5 py-2 text-xs text-gray-600 shadow-none transition-colors duration-150 focus-visible:ring-0 sm:px-3 sm:text-sm";
  let shareStatus = "";
  let timer = null;

  onDestroy(() => timer && clearTimeout(timer));

  function setStatus(msg) {
    if (timer) clearTimeout(timer);
    shareStatus = msg;
    timer = setTimeout(() => ((shareStatus = ""), (timer = null)), 2500);
  }

  async function shareApp() {
    const url =
      typeof window !== "undefined" ? window.location.href : "https://drshrink.app";
    const data = {
      title: "DrShrink",
      text: "Drop a file in, get a smaller one out. No settings, no fuss.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setStatus("Shared DrShrink");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied");
      } else {
        setStatus("Share unavailable");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      setStatus("Try again");
    }
  }
</script>

<nav class="flex items-center space-x-1 sm:space-x-2" aria-label="DrShrink footer">
  <button type="button" class={btn} on:click={() => dispatch("showAbout")}>
    About
  </button>
  <button type="button" class={btn} on:click={() => dispatch("showOptions")}>
    Options
  </button>
  <button
    type="button"
    class="{btn} footer-pass"
    class:is-unlocked={$isSupporter}
    on:click={() => dispatch("showSupport")}
  >
    {$isSupporter ? "Passport ✓" : "Passport"}
  </button>
  <button type="button" class={btn} on:click={shareApp} aria-label="Share DrShrink">
    Share
  </button>
  <span class="sr-only" role="status" aria-live="polite">{shareStatus}</span>
</nav>

<style>
  .footer-nav-button {
    border-radius: 0.75rem;
  }
  .footer-nav-button:hover {
    background-color: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.12);
    color: var(--ds-accent-color, #c026d3);
  }
  .footer-nav-button:focus-visible {
    outline: 2px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.55);
    outline-offset: 2px;
    background-color: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.14);
    color: var(--ds-accent-color, #c026d3);
  }
  /* The Passport pill — the footer's one bit of colour (TalkType pattern). */
  .footer-pass {
    border-radius: 999px;
    background: var(--ds-accent-color, #c026d3);
    color: #fffdf7;
    border: 2px solid #1e1714;
    box-shadow: 2px 2px 0 #1e1714;
    font-weight: 900;
    padding-left: 0.9rem;
    padding-right: 0.9rem;
    transition:
      transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.15s ease,
      filter 0.15s ease;
  }
  .footer-pass:hover {
    background: var(--ds-accent-color, #c026d3);
    color: #fffdf7;
    filter: brightness(1.06);
    transform: translateY(-1px);
    box-shadow: 3px 3px 0 #1e1714;
  }
  .footer-pass:active {
    transform: translateY(1px);
    box-shadow: 1px 1px 0 #1e1714;
  }
  .footer-pass.is-unlocked {
    background: #fffdf7;
    color: #1e1714;
  }
  .footer-pass.is-unlocked:hover {
    background: #fffdf7;
    color: #1e1714;
  }
  @media (prefers-reduced-motion: reduce) {
    .footer-pass {
      transition: none;
    }
    .footer-pass:hover,
    .footer-pass:active {
      transform: none;
    }
  }
</style>
