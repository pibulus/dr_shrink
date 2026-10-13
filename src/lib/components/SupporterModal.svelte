<script>
  import Modal from "./Modal.svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";
  import { SUPPORT_URL } from "$lib/services/supporterService.js";

  export let open = false;
</script>

<Modal {open} title="Buy the doc a coffee" on:close>
  <svelte:fragment slot="icon">
    <ThemeMascot theme={$theme} size="30px" />
  </svelte:fragment>
  <p>
    DrShrink is a little independent tool made by Pablo. If it saved you some
    space or a bit of hassle, a coffee helps keep it going. ☕
  </p>
  <a class="cta" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
    Leave a tip on Ko-fi ↗
  </a>
  <p class="fine">
    Choose your amount. Completely optional — tips don't unlock features or
    change file limits. Ko-fi handles the payment on its own site.
  </p>
</Modal>

<style>
  .cta {
    display: block;
    margin-top: 1rem;
    min-height: 44px;
    text-align: center;
    text-decoration: none;
    border-radius: 999px;
    background: var(--ds-primary-color, #9333ea);
    color: #fff;
    font-weight: 800;
    padding: 0.78rem 1rem;
  }
  .cta:hover {
    filter: brightness(1.08);
  }
  .cta:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 3px;
  }
  .fine {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: #6b6671;
    line-height: 1.5;
  }
</style>
