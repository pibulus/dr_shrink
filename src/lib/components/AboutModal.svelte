<script>
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";
  import { isSupporter, SUPPORT_URL } from "$lib/services/supporterService.js";

  export let open = false;

  const dispatch = createEventDispatcher();

  // Practical tips for Passport holders — dealt three at a time, reshuffled
  // each open. Tips, not lore.
  const TIPS = [
    "Drop a whole folder: dotfile junk is skipped, paths are kept in the zip.",
    "Drag files straight onto the doctor — the glow means a clean catch.",
    "Loose batches hand back each file on its own instead of one zip.",
    "Audio from video turns a lecture recording into a tiny mp3.",
    "Fit under 10 MB walks quality down, then size, until it lands.",
    "PNG keeps transparency; JPEG opens on anything; AVIF is the tiniest.",
    "Recent keeps the last results for 30 minutes — re-download from there.",
    "Five quick taps on the doctor is a tickle, not five file dialogs.",
    "Crisp is for photos headed to print; Lean is for chat and mail.",
  ];
  let tips = [];
  function deal() {
    tips = [...TIPS].sort(() => Math.random() - 0.5).slice(0, 3);
  }
  $: if (open) deal();
</script>

<Modal {open} pitch labelledBy="about-title" on:close>
  <div class="ds-pitch">
    <div class="ds-pitch-mascot" aria-hidden="true">
      <ThemeMascot theme={$theme} size="100%" />
    </div>

    {#if $isSupporter}
      <div class="ds-pitch-head">
        <h2 id="about-title" class="ds-headline">
          Doctor's <span class="ds-marker">notes.</span>
        </h2>
        <p class="ds-accent-sub">Three fresh ones every visit.</p>
      </div>
      <ul class="ds-pitch-list ds-pitch-copy">
        {#each tips as tip}
          <li>{tip}</li>
        {/each}
      </ul>
      <button class="ds-pitch-secondary is-link" type="button" on:click={deal}>
        Deal three more
      </button>
    {:else}
      <div class="ds-pitch-head">
        <h2 id="about-title" class="ds-headline">
          The shrink-anything <span class="ds-marker">thing.</span>
        </h2>
        <p class="ds-accent-sub">Drop it. Shrink it. Done.</p>
      </div>
      <div class="ds-pitch-copy">
        <p>
          I kept emailing myself files that were too big for email. So I made
          a doctor for them. Whatever lands here comes back smaller and more
          useful — right in the browser, nothing uploaded.
        </p>
        <ul class="ds-pitch-list">
          <li>Photos → crisp and way smaller.</li>
          <li>A pile of files → one tidy zip, folders intact.</li>
          <li>Audio and video → lean mp3 and mp4.</li>
          <li>Docs and text → stripped and squeezed.</li>
        </ul>
      </div>
      <button
        class="ds-pitch-cta"
        type="button"
        on:click={() => dispatch("showPassport")}
      >
        DrShrink Passport
      </button>
    {/if}

    <p class="ds-fine">
      Files aren't uploaded. Recent filenames and savings stay in this browser;
      the last results are cached for 30 minutes and Clear Recent removes them.
      The visit counter never sees file contents.
    </p>

    <div class="foot">
      <a
        class="foot-mascot"
        href="https://github.com/pibulus"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pablo on GitHub"
      >
        <ThemeMascot theme={$theme} size="22px" />
      </a>
      <a href="https://github.com/pibulus" target="_blank" rel="noopener noreferrer">
        🐙 GitHub
      </a>
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        ☕ Coffee jar
      </a>
      <span class="sig">Pablo · Melbourne</span>
    </div>
  </div>
</Modal>

<style>
  .foot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.25rem 0.9rem;
    padding-top: 0.25rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--ds-muted, #6b6671);
  }
  .foot a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 44px;
    color: var(--ds-accent-color, #c026d3);
  }
  .foot a:hover {
    text-decoration: underline;
  }
  .foot a:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 2px;
    border-radius: 8px;
  }
  .foot-mascot {
    width: 44px;
    justify-content: center;
    transition: transform 0.15s ease;
  }
  .foot-mascot:hover {
    transform: scale(1.1);
    text-decoration: none;
  }
  .sig {
    font-weight: 600;
  }
</style>
