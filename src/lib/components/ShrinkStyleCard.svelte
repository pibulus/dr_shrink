<script>
  // The Passport's dials, as segmented pills — never a slider. Locked for
  // free visitors: same controls, disabled, one chip, the whole card asks to
  // be opened.
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
    { key: "fitUnder", label: "Fit under" },
    { key: "maxDim", label: "Max size" },
  ];
</script>

<!-- Locked = one big button to the Passport; unlocked = a plain card. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="ds-card style-card"
  class:locked
  on:click={onLockedActivate}
  on:keydown={onLockedActivate}
  tabindex={locked ? 0 : undefined}
  role={locked ? "button" : undefined}
  aria-label={locked ? "Shrink style — opens with the Passport" : undefined}
>
  <div class="title-row">
    <h4 class="ds-section-title">Shrink style</h4>
    {#if locked}
      <span class="ds-chip">Passport</span>
    {:else if custom}
      <button class="reset" type="button" on:click={resetPrefs}>reset</button>
    {/if}
  </div>

  {#each rows as row}
    <div class="dial-row">
      <span class="dial-label">{row.label}</span>
      <div class="ds-pills" role="group" aria-label={row.label}>
        {#each PREF_CHOICES[row.key] as c}
          {@const na = row.key === "format" && c.id === "avif" && !avifOk}
          <button
            type="button"
            class="ds-pill"
            class:on={$shrinkPrefs[row.key] === c.id}
            class:na
            disabled={locked || na}
            aria-pressed={$shrinkPrefs[row.key] === c.id}
            title={na ? "Not in this browser" : c.hint}
            on:click={() => setPref(row.key, c.id)}
          >
            {c.label}{#if na}<span class="na-tag"> n/a</span>{/if}
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <div class="dial-row switches">
    <label class="switch-row">
      <span class="dial-label">Audio from video<small>drop a video, get an mp3</small></span>
      <button
        type="button"
        class="ds-switch"
        class:on={$shrinkPrefs.audioOnly}
        role="switch"
        aria-checked={$shrinkPrefs.audioOnly}
        aria-label="Audio from video"
        disabled={locked}
        on:click={() => setPref("audioOnly", !$shrinkPrefs.audioOnly)}
      >
        <span class="knob"></span>
      </button>
    </label>
    <label class="switch-row">
      <span class="dial-label">Loose batches<small>each file on its own, no zip</small></span>
      <button
        type="button"
        class="ds-switch"
        class:on={$shrinkPrefs.looseBatch}
        role="switch"
        aria-checked={$shrinkPrefs.looseBatch}
        aria-label="Loose batches"
        disabled={locked}
        on:click={() => setPref("looseBatch", !$shrinkPrefs.looseBatch)}
      >
        <span class="knob"></span>
      </button>
    </label>
  </div>

  <p class="dial-hint">
    {#if locked}
      Free runs the balanced default. The Passport opens the dials.
    {:else}
      Balanced is the default the free tier runs. Every dial here is remembered.
    {/if}
  </p>
</div>

<style>
  .style-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .style-card.locked {
    cursor: pointer;
  }
  .style-card.locked:focus-visible {
    outline: 2px solid var(--ds-accent-color, #c026d3);
    outline-offset: 3px;
  }
  .locked .dial-row,
  .locked .switches {
    opacity: 0.55;
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
    min-height: 32px;
    padding: 0 0.5rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ds-accent-color, #c026d3);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .dial-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }
  .dial-row :global(.ds-pills) {
    justify-content: center;
  }
  .dial-label {
    display: flex;
    flex-direction: column;
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--ds-ink-deep, #1e1714);
  }
  .dial-label small {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--ds-muted, #6b6671);
  }
  .ds-pill.na {
    opacity: 0.45;
  }
  .na-tag {
    font-size: 0.65rem;
    font-weight: 700;
  }
  .switches {
    align-items: stretch;
    gap: 0.6rem;
    padding-top: 0.2rem;
    border-top: 2px dashed rgba(41, 37, 36, 0.14);
  }
  .switch-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
  }
  .dial-hint {
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ds-muted, #6b6671);
  }
</style>
