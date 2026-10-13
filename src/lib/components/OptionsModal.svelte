<script>
  import Modal from "./Modal.svelte";
  import { theme, applyTheme } from "$lib";
  import { THEME_LIST } from "$lib/constants.js";
  import { muted, toggleMuted } from "$lib/services/soundService.js";
  import { history, clearHistory } from "$lib/services/historyService.js";
  import ThemeMascot from "./ThemeMascot.svelte";

  export let open = false;
  export let autoDownload = true;
  export let onToggleAuto = undefined;
  export let onClearHistory = () => clearHistory().catch(() => {});
  export let busy = false;
</script>

<Modal {open} title="Options" on:close>
  <svelte:fragment slot="icon">
    <ThemeMascot theme={$theme} size="30px" />
  </svelte:fragment>
  <div class="rows">
    <!-- Theme — pick the doctor's vibe (mini-brain per theme, à la TalkType) -->
    <div class="row col">
      <span class="label">Vibe</span>
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
            <span class="vibe-art"
              ><ThemeMascot theme={t.id} size="40px" /></span
            >
            <span class="vibe-name">{t.label}</span>
            {#if $theme === t.id}
              <span class="vibe-check" aria-hidden="true">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Sound -->
    <div class="row">
      <span class="label">Sounds</span>
      <button
        class="switch"
        class:on={!$muted}
        role="switch"
        aria-checked={!$muted}
        aria-label="Toggle sounds"
        on:click={toggleMuted}
      >
        <span class="knob"></span>
      </button>
    </div>

    <!-- Auto-download -->
    <div class="row">
      <span class="label">Auto-download</span>
      <button
        class="switch"
        class:on={autoDownload}
        role="switch"
        aria-checked={autoDownload}
        aria-label="Toggle auto-download"
        on:click={onToggleAuto}
      >
        <span class="knob"></span>
      </button>
    </div>

    <!-- History -->
    <div class="row">
      <span class="label">History <em>({$history.length})</em></span>
      <button
        class="link"
        on:click={onClearHistory}
        disabled={!$history.length || busy}
      >
        clear
      </button>
    </div>
  </div>
</Modal>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .row.col {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
  }
  .label {
    font-weight: 700;
    color: var(--ds-ink, #1f2937);
  }
  .label em {
    font-style: normal;
    color: #9b9199;
    font-weight: 500;
  }

  .vibes {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    width: 100%;
  }
  .vibe {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.55rem 0.25rem 0.45rem;
    border-radius: 14px;
    border: 2px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    transition:
      transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .vibe:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 0, 0, 0.16);
  }
  .vibe.on {
    border-color: var(--ds-primary-color, #9333ea);
    box-shadow: 0 0 0 2px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.35);
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
    font-weight: 700;
    color: var(--ds-ink, #1f2937);
  }
  .vibe-check {
    position: absolute;
    top: -6px;
    right: -6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: var(--ds-primary-color, #9333ea);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 800;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
  }
  @media (prefers-reduced-motion: reduce) {
    .vibe,
    .vibe-art {
      transition: none;
    }
    .vibe:hover {
      transform: none;
    }
    .vibe:hover .vibe-art {
      transform: none;
    }
  }

  .switch {
    border: 9px solid transparent;
    box-sizing: content-box;
    background-clip: padding-box;
    width: 46px;
    height: 26px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.18);
    position: relative;
    transition: background 0.18s ease;
  }
  .switch.on {
    background: var(--ds-primary-color, #9333ea);
  }
  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #fff;
    transition: transform 0.18s ease;
  }
  .switch.on .knob {
    transform: translateX(20px);
  }

  .link {
    min-width: 44px;
    min-height: 44px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ds-accent-color, #c026d3);
    text-decoration: underline;
  }
  .link:disabled {
    color: #c9c2cc;
    text-decoration: none;
    cursor: default;
  }
</style>
