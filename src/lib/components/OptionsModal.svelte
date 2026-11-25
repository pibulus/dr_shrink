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
    <ThemeMascot theme={$theme} size="28px" />
  </svelte:fragment>

  <div class="sections">
    <!-- 1. Everyday controls first: live, free, zero scroll -->
    <section class="ds-card prefs-card" aria-label="General preferences">
      <div class="vibes" role="group" aria-label="Theme">
        {#each THEME_LIST as t}
          <button
            type="button"
            class="vibe"
            class:on={$theme === t.id}
            title={t.label}
            aria-label="{t.label} vibe"
            aria-pressed={$theme === t.id}
            on:click={() => applyTheme(t.id)}
          >
            <span class="vibe-art"><ThemeMascot theme={t.id} size="22px" /></span>
            <span class="vibe-name">{t.label}</span>
          </button>
        {/each}
      </div>

      <div class="pref-list">
        <div class="row">
          <span class="opt-label">Sounds</span>
          <button
            type="button"
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
            type="button"
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

        {#if $history.length > 0}
          <div class="row">
            <span class="opt-label">Recent history <em>({$history.length})</em></span>
            <button
              type="button"
              class="opt-link"
              on:click={onClearHistory}
              disabled={busy}
            >
              clear
            </button>
          </div>
        {/if}
      </div>
    </section>

    <!-- 2. Shrink dials (Passport) -->
    <section>
      <slot name="shrink-style" />
    </section>

    <!-- 3. Passport status or direct unlock CTA -->
    {#if $isSupporter}
      <section class="ds-card passport">
        <div class="pass-head">
          <h4 class="ds-section-title">Passport</h4>
          <span class="ds-chip">Ready</span>
        </div>
        {#if $passportPhrase}
          <p class="phrase">{$passportPhrase}</p>
        {:else if $passportCode}
          <p class="ds-code">{$passportCode}</p>
        {/if}
        <div class="pass-actions">
          <button class="ds-pitch-secondary" type="button" on:click={copyPass}>
            {copied || "Copy unlock link"}
          </button>
          <button
            class="forget"
            class:armed={forgetArmed}
            type="button"
            on:click={onForget}
          >
            {forgetArmed ? "Tap again to forget" : "Forget"}
          </button>
        </div>
      </section>
    {:else}
      <button
        class="ds-pitch-cta"
        type="button"
        on:click={() => dispatch("showPassport")}
      >
        Unlock Shrink Dials · {PRICING.displayPrice}
      </button>
    {/if}
  </div>
</Modal>

<style>
  .sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .prefs-card {
    padding: 0.7rem 0.85rem 0.45rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .vibes {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.35rem;
    width: 100%;
  }

  .vibe {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-height: 40px;
    padding: 0.3rem 0.35rem;
    border-radius: 11px;
    border: 1.75px solid rgba(41, 37, 36, 0.22);
    background: var(--ds-paper, #fffdf7);
    cursor: pointer;
    transition:
      transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.15s ease,
      border-color 0.15s ease,
      background-color 0.15s ease;
  }
  .vibe:hover {
    transform: translateY(-1px);
    border-color: var(--ds-line, #292524);
  }
  .vibe.on {
    border-color: var(--ds-line, #292524);
    background: #fff9ec;
    box-shadow: 2px 2px 0 var(--ds-line, #292524);
  }
  .vibe-art {
    line-height: 0;
    flex-shrink: 0;
  }
  .vibe-name {
    font-size: 0.73rem;
    font-weight: 800;
    color: var(--ds-ink-deep, #1e1714);
    white-space: nowrap;
  }
  .vibe.on .vibe-name {
    color: var(--ds-primary-color, #9333ea);
  }

  .pref-list {
    display: flex;
    flex-direction: column;
    border-top: 1.5px solid rgba(41, 37, 36, 0.1);
    padding-top: 0.25rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 38px;
  }

  .opt-label {
    font-weight: 800;
    font-size: 0.86rem;
    color: var(--ds-ink-deep, #1e1714);
  }
  .opt-label em {
    font-style: normal;
    color: var(--ds-muted, #6b6671);
    font-weight: 600;
  }

  .opt-link {
    min-width: 44px;
    min-height: 38px;
    font-size: 0.82rem;
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
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
    font-size: 0.95rem;
    text-align: center;
  }
  .phrase {
    text-align: center;
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--ds-primary-color, #9333ea);
  }
  .pass-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding-top: 0.1rem;
  }
  .pass-actions .ds-pitch-secondary {
    flex: 1;
    min-height: 38px;
    font-size: 0.82rem;
  }
  .forget {
    min-height: 38px;
    padding: 0 0.5rem;
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--ds-muted, #6b6671);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  .forget.armed {
    color: var(--ds-rose, #c4607a);
  }

  @media (max-width: 400px) {
    .vibe {
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.35rem 0.15rem;
    }
    .vibe-name {
      font-size: 0.68rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .vibe {
      transition: none;
    }
    .vibe:hover {
      transform: none;
    }
  }
</style>
