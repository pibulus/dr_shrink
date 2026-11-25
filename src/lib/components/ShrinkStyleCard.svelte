<script>
  // The Passport's dials, arranged in one calm left-aligned 2-column grid.
  // Every row flows Left = Least shrink (Crisp / Original / Off) -> Right = Tightest shrink.
  import { createEventDispatcher, onMount } from "svelte";
  import {
    shrinkPrefs,
    setPref,
    resetPrefs,
    isCustom,
    PREF_CHOICES,
  } from "$lib/services/shrinkPrefs.js";
  import { supportsAvif } from "$lib/services/compressService.js";

  export let locked = false;

  const dispatch = createEventDispatcher();
  let avifOk = true;
  onMount(async () => {
    avifOk = await supportsAvif();
  });

  $: custom = isCustom($shrinkPrefs);

  function onLockedActivate(e) {
    if (!locked) return;
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    dispatch("unlock");
  }

  const rows = [
    { key: "format", label: "Format" },
    { key: "quality", label: "Quality" },
    { key: "maxDim", label: "Max width" },
    { key: "fitUnder", label: "Fit under" },
  ];
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="ds-card style-card"
  class:locked
  on:click={onLockedActivate}
  on:keydown={onLockedActivate}
  tabindex={locked ? 0 : undefined}
  role={locked ? "button" : undefined}
  aria-label={locked ? "Shrink dials — unlock with the Passport" : undefined}
>
  <div class="title-row">
    <h4 class="ds-section-title">Shrink dials</h4>
    {#if locked}
      <span class="ds-chip">Passport</span>
    {:else if custom}
      <button class="reset" type="button" on:click={resetPrefs}>reset</button>
    {/if}
  </div>

  <div class="dial-grid">
    {#each rows as row}
      <div class="dial-row">
        <span class="dial-label">{row.label}</span>
        <div
          class="seg-track cols-{PREF_CHOICES[row.key].length}"
          role="group"
          aria-label={row.label}
        >
          {#each PREF_CHOICES[row.key] as c}
            {@const na = row.key === "format" && c.id === "avif" && !avifOk}
            <button
              type="button"
              class="seg-pill"
              class:on={$shrinkPrefs[row.key] === c.id}
              class:na
              disabled={locked || na}
              aria-pressed={$shrinkPrefs[row.key] === c.id}
              title={na ? "AVIF encoding isn't supported in this browser" : c.hint}
              on:click={() => setPref(row.key, c.id)}
            >
              <span>{c.label}</span>{#if na}<span class="na-dot" aria-hidden="true">· n/a</span>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="switches">
    <label class="switch-row">
      <span class="switch-copy">
        <span class="dial-label">Video → MP3</span>
        <small>extract audio only</small>
      </span>
      <button
        type="button"
        class="ds-switch"
        class:on={$shrinkPrefs.audioOnly}
        role="switch"
        aria-checked={$shrinkPrefs.audioOnly}
        aria-label="Extract MP3 audio from video"
        disabled={locked}
        on:click={() => setPref("audioOnly", !$shrinkPrefs.audioOnly)}
      >
        <span class="knob"></span>
      </button>
    </label>

    <label class="switch-row">
      <span class="switch-copy">
        <span class="dial-label">Loose batches</span>
        <small>each file separate</small>
      </span>
      <button
        type="button"
        class="ds-switch"
        class:on={$shrinkPrefs.looseBatch}
        role="switch"
        aria-checked={$shrinkPrefs.looseBatch}
        aria-label="Loose batches without zipping"
        disabled={locked}
        on:click={() => setPref("looseBatch", !$shrinkPrefs.looseBatch)}
      >
        <span class="knob"></span>
      </button>
    </label>
  </div>

  <p class="dial-hint">
    {#if locked}
      Free runs the balanced default. Passport opens every dial.
    {:else}
      Every dial here is saved automatically for this browser.
    {/if}
  </p>
</div>

<style>
  .style-card {
    padding: 0.7rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .style-card.locked {
    cursor: pointer;
  }
  .style-card.locked:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 3px;
  }
  .locked .dial-grid,
  .locked .switches {
    opacity: 0.58;
    pointer-events: none;
  }

  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .title-row .ds-section-title {
    margin: 0;
  }
  .reset {
    min-height: 28px;
    padding: 0 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ds-accent-color, #c026d3);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .dial-grid {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .dial-row {
    display: grid;
    grid-template-columns: 4.9rem minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
  }

  .dial-label {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--ds-ink-deep, #1e1714);
    line-height: 1.2;
    white-space: nowrap;
  }

  .seg-track {
    display: grid;
    gap: 0.25rem;
    padding: 0.18rem;
    border-radius: 11px;
    background: rgba(41, 37, 36, 0.06);
    border: 1.5px solid rgba(41, 37, 36, 0.14);
  }
  .seg-track.cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .seg-track.cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .seg-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    min-height: 32px;
    padding: 0 0.35rem;
    border-radius: 8px;
    border: 1.5px solid transparent;
    background: transparent;
    color: var(--ds-ink-deep, #1e1714);
    font-size: 0.75rem;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 0.14s ease,
      color 0.14s ease,
      box-shadow 0.14s ease;
  }
  .seg-pill:hover:not(:disabled):not(.on) {
    background: rgba(255, 253, 247, 0.78);
  }
  .seg-pill.on {
    background: var(--ds-primary-color, #9333ea);
    color: var(--ds-paper, #fffdf7);
    border-color: var(--ds-ink-deep, #1e1714);
    box-shadow: 1.5px 1.5px 0 var(--ds-ink-deep, #1e1714);
  }
  .seg-pill:disabled {
    cursor: default;
  }
  .seg-pill.na {
    opacity: 0.42;
  }
  .na-dot {
    font-size: 0.62rem;
    font-weight: 700;
    opacity: 0.85;
  }

  .switches {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    padding-top: 0.45rem;
    border-top: 1.5px dashed rgba(41, 37, 36, 0.14);
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    padding: 0.3rem 0.5rem;
    border-radius: 10px;
    background: rgba(41, 37, 36, 0.035);
    cursor: pointer;
  }

  .switch-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .switch-copy small {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ds-muted, #6b6671);
    line-height: 1.25;
  }

  .dial-hint {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.35;
    color: var(--ds-muted, #6b6671);
    text-align: center;
    text-wrap: balance;
  }

  @media (max-width: 420px) {
    .dial-row {
      grid-template-columns: 4.3rem minmax(0, 1fr);
      gap: 0.35rem;
    }
    .seg-pill {
      font-size: 0.7rem;
      padding: 0 0.2rem;
    }
    .na-dot {
      display: none;
    }
    .switches {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }
  }
</style>
