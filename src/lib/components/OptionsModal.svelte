<script>
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";
  import { theme, applyTheme } from "$lib";
  import { THEME_LIST } from "$lib/constants.js";
  import { muted, toggleMuted } from "$lib/services/soundService.js";
  import { history, clearHistory } from "$lib/services/historyService.js";
  import {
    isSupporter,
    passportCode,
    passportPhrase,
    unlockUrl,
    forgetPassport,
  } from "$lib/services/supporterService.js";
  import { PRICING } from "$lib/config/pricing.js";
  import ThemeMascot from "./ThemeMascot.svelte";

  export let open = false;
  export let autoDownload = true;
  export let onToggleAuto = undefined;
  export let onClearHistory = () => clearHistory().catch(() => {});
  export let busy = false;

  const dispatch = createEventDispatcher();

  let copied = "";
  let copyTimer = null;
  async function copyPass() {
    const text = unlockUrl() || $passportCode;
    try {
      await navigator.clipboard.writeText(text);
      copied = "Copied";
    } catch {
      copied = "Copy blocked here";
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = ""), 1800);
  }

  // Two-step forget: first tap arms it, second tap does it. No confirm().
  let forgetArmed = false;
  let forgetTimer = null;
  function onForget() {
    if (!forgetArmed) {
      forgetArmed = true;
      clearTimeout(forgetTimer);
      forgetTimer = setTimeout(() => (forgetArmed = false), 3000);
      return;
    }
    forgetArmed = false;
    forgetPassport();
  }
</script>

<Modal {open} title="Options" on:close>
  <svelte:fragment slot="icon">
    <ThemeMascot theme={$theme} size="30px" />
  </svelte:fragment>

  <div class="sections">
    <!-- Vibe — the doctor's colours -->
    <section>
      <h4 class="ds-section-title">Vibe</h4>
      <div class="vibes" role="group" aria-label="Theme">
        {#each THEME_LIST as t}
          <button
            class="vibe"
            class:on={$theme === t.id}
            title={t.label}
            aria-label="{t.label} vibe"
            aria-pressed={$theme === t.id}
            on:click={() => applyTheme(t.id)}
          >
            <span class="vibe-art"><ThemeMascot theme={t.id} size="40px" /></span>
            <span class="vibe-name">{t.label}</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- Shrink style — the Passport's dials (card slotted in by the page) -->
    <section>
      <slot name="shrink-style" />
    </section>

    <!-- System -->
    <section class="ds-card system">
      <h4 class="ds-section-title">System</h4>
      <div class="row">
        <span class="opt-label">Sounds</span>
        <button
          class="ds-switch"
          class:on={!$muted}
          role="switch"
          aria-checked={!$muted}
          aria-label="Sounds"
          on:click={toggleMuted}
        >
          <span class="knob"></span>
        </button>
      </div>
      <div class="row">
        <span class="opt-label">Auto-download</span>
        <button
          class="ds-switch"
          class:on={autoDownload}
          role="switch"
          aria-checked={autoDownload}
          aria-label="Auto-download"
          on:click={onToggleAuto}
        >
          <span class="knob"></span>
        </button>
      </div>
      <div class="row">
        <span class="opt-label">History <em>({$history.length})</em></span>
        <button
          class="opt-link"
          on:click={onClearHistory}
          disabled={!$history.length || busy}
        >
          clear
        </button>
      </div>
    </section>

    <!-- Passport -->
    {#if $isSupporter}
      <section class="ds-card passport">
        <div class="pass-head">
          <h4 class="ds-section-title">Passport</h4>
          <span class="ds-chip">Ready</span>
        </div>
        {#if $passportCode}
          <p class="ds-code">{$passportCode}</p>
        {/if}
        {#if $passportPhrase}
          <p class="phrase">{$passportPhrase}</p>
        {/if}
        <div class="pass-actions">
          <button class="ds-pitch-secondary" type="button" on:click={copyPass}>
            {copied || "Copy unlock link"}
          </button>
          <button
            class="ds-pitch-secondary is-link forget"
            class:armed={forgetArmed}
            type="button"
            on:click={onForget}
          >
            {forgetArmed ? "Tap again to forget it here" : "Forget this passport"}
          </button>
        </div>
      </section>
    {:else}
      <button
        class="ds-pitch-cta"
        type="button"
        on:click={() => dispatch("showPassport")}
      >
        DrShrink Passport · {PRICING.displayPrice}
      </button>
    {/if}
  </div>
</Modal>

<style>
  .sections {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
  }
  .opt-label {
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--ds-ink-deep, #1e1714);
  }
  .opt-label em {
    font-style: normal;
    color: var(--ds-muted, #6b6671);
    font-weight: 600;
  }

  .vibes {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    width: 100%;
  }
  .vibe {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.55rem 0.25rem 0.45rem;
    border-radius: 14px;
    border: 2px solid var(--ds-line, #292524);
    background: var(--ds-paper-2, #fffdf5);
    cursor: pointer;
    transition:
      transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.15s ease,
      background-color 0.15s ease;
  }
  .vibe:hover {
    transform: translateY(-2px);
  }
  .vibe.on {
    background: var(--ds-paper, #fffdf7);
    box-shadow: 2px 2px 0 var(--ds-line, #292524);
  }
  .vibe-art {
    transition: transform 0.2s ease;
    line-height: 0;
  }
  .vibe:hover .vibe-art {
    transform: scale(1.08);
  }
  .vibe-name {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--ds-ink-deep, #1e1714);
  }
  .vibe.on .vibe-name {
    color: var(--ds-primary-color, #9333ea);
  }

  .system {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .opt-link {
    min-width: 44px;
    min-height: 44px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ds-accent-color, #c026d3);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .opt-link:disabled {
    color: #c9c2cc;
    text-decoration: none;
    cursor: default;
  }

  .passport {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pass-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pass-head .ds-section-title {
    margin: 0;
  }
  .passport .ds-code {
    font-size: 1.05rem;
    text-align: center;
  }
  .phrase {
    text-align: center;
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--ds-primary-color, #9333ea);
  }
  .pass-actions {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-top: 0.25rem;
  }
  .forget {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--ds-muted, #6b6671);
  }
  .forget.armed {
    color: var(--ds-rose, #c4607a);
  }

  @media (prefers-reduced-motion: reduce) {
    .vibe,
    .vibe-art {
      transition: none;
    }
    .vibe:hover,
    .vibe:hover .vibe-art {
      transform: none;
    }
  }
</style>
