<script>
  import Modal from "./Modal.svelte";
  import { theme, applyTheme } from "$lib";
  import { THEME_LIST } from "$lib/constants.js";
  import { muted, toggleMuted } from "$lib/services/soundService.js";
  import { history, clearHistory } from "$lib/services/historyService.js";

  export let open = false;
</script>

<Modal {open} title="Options" icon="🎛️" on:close>
  <div class="rows">
    <!-- Theme -->
    <div class="row col">
      <span class="label">Theme</span>
      <div class="dots" role="group" aria-label="Theme">
        {#each THEME_LIST as t}
          <button
            class="dot dot-{t.id}"
            class:on={$theme === t.id}
            title={t.label}
            aria-label={t.label}
            aria-pressed={$theme === t.id}
            on:click={() => applyTheme(t.id)}
          ></button>
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

    <!-- History -->
    <div class="row">
      <span class="label">History <em>({$history.length})</em></span>
      <button class="link" on:click={clearHistory} disabled={!$history.length}>
        clear
      </button>
    </div>
  </div>
</Modal>

<style>
  .rows { display: flex; flex-direction: column; gap: 1.1rem; }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .row.col { flex-direction: column; align-items: flex-start; gap: 0.55rem; }
  .label { font-weight: 700; color: var(--ds-ink, #1f2937); }
  .label em { font-style: normal; color: #9b9199; font-weight: 500; }

  .dots { display: flex; gap: 0.6rem; }
  .dot {
    width: 26px; height: 26px; border-radius: 999px;
    border: 3px solid rgba(0, 0, 0, 0.12); cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }
  .dot:hover { transform: scale(1.12); }
  .dot.on { border-color: rgba(0, 0, 0, 0.55); transform: scale(1.12); }
  .dot-vibrant { background: linear-gradient(135deg, #9333ea, #f472b6); }
  .dot-warm { background: linear-gradient(135deg, #ff7a45, #ffd24c); }
  .dot-cool { background: linear-gradient(135deg, #0fb5c9, #5fe07a); }
  .dot-minimal { background: linear-gradient(135deg, #52525b, #a1a1aa); }

  .switch {
    width: 46px; height: 26px; border-radius: 999px;
    background: rgba(0, 0, 0, 0.18); position: relative;
    transition: background 0.18s ease;
  }
  .switch.on { background: var(--ds-primary-color, #9333ea); }
  .knob {
    position: absolute; top: 3px; left: 3px;
    width: 20px; height: 20px; border-radius: 999px; background: #fff;
    transition: transform 0.18s ease;
  }
  .switch.on .knob { transform: translateX(20px); }

  .link {
    font-size: 0.85rem; font-weight: 600;
    color: var(--ds-accent-color, #c026d3); text-decoration: underline;
  }
  .link:disabled { color: #c9c2cc; text-decoration: none; cursor: default; }
</style>
