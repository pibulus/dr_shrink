<script>
  import { Mascot } from "$lib/components/mascot";
  import PageLayout from "$lib/components/layout/PageLayout.svelte";
  import AnimatedTitle from "$lib/components/AnimatedTitle.svelte";
  import FooterComponent from "$lib/components/FooterComponent.svelte";
  import {
    compress,
    formatBytes,
    downloadBlob,
  } from "$lib/services/compressService.js";
  import { theme, applyTheme } from "$lib";
  import { THEME_LIST } from "$lib/constants.js";
  import { isSupporter, checkDrop } from "$lib/services/supporterService.js";
  import UnlockModal from "$lib/components/UnlockModal.svelte";

  let mascot;
  let dragOver = false;
  let busy = false;
  let busyLabel = "Shrinking…";
  let error = "";
  let showUnlock = false;
  /** @type {Array<{name,inputSize,outputSize,saved,ratio,blob,grew,note}>} */
  let results = [];

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    error = "";

    // Supporter gate (size / batch limits)
    const gate = checkDrop(files, $isSupporter);
    if (!gate.ok) {
      error = gate.reason;
      if (gate.gated) showUnlock = true;
      return;
    }

    busy = true;
    busyLabel = files.length > 1 ? "Zipping…" : "Shrinking…";
    mascot?.startThinking();

    try {
      const out = await compress(files, {
        onProgress: (p) => (busyLabel = `Crunching… ${Math.round(p * 100)}%`),
      });
      for (const r of out) {
        results = [r, ...results];
        mascot?.react(Math.round(Math.max(0, r.saved) / 1024));
      }
    } catch (e) {
      error = e.message;
    }

    busy = false;
    busyLabel = "Shrinking…";
    mascot?.stopThinking();
  }

  function onDrop(e) {
    e.preventDefault();
    dragOver = false;
    handleFiles(e.dataTransfer.files);
  }

  function onPick(e) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  $: totalSaved = results.reduce((a, r) => a + Math.max(0, r.saved), 0);
</script>

<PageLayout>
  <div class="flex w-full flex-col items-center gap-5">
    <div class="mascot-slot">
      <Mascot
        bind:this={mascot}
        character="brain"
        accessory="head-mirror"
        theme={$theme}
        {busy}
        ariaLabel="DrShrink — choose a file"
        on:activate={() => document.getElementById("file-input")?.click()}
      />
    </div>

    <AnimatedTitle />

    <!-- Drop zone -->
    <label
      for="file-input"
      class="drop"
      class:drop-over={dragOver}
      class:drop-busy={busy}
      on:dragover|preventDefault={() => (dragOver = true)}
      on:dragleave={() => (dragOver = false)}
      on:drop={onDrop}
    >
      <input
        id="file-input"
        type="file"
        multiple
        class="sr-only"
        on:change={onPick}
      />
      {#if busy}
        <span class="drop-text">{busyLabel}</span>
      {:else}
        <span class="drop-text">Drop anything here</span>
        <span class="drop-sub">images · text · docs · audio · batches → zip</span>
      {/if}
    </label>

    {#if error}
      <p class="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
        {error}
      </p>
    {/if}

    {#if results.length}
      <div class="w-full">
        <p class="mb-2 text-center text-sm font-bold text-accent">
          Saved {formatBytes(totalSaved)} total 🎉
        </p>
        <ul class="flex flex-col gap-2">
          {#each results as r}
            <li class="result">
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold">{r.name}</p>
                <p class="text-sm text-gray-500">
                  {formatBytes(r.inputSize)} → {formatBytes(r.outputSize)}
                  {#if !r.grew}
                    <span class="font-bold text-green-600">
                      −{Math.round((1 - r.ratio) * 100)}%
                    </span>
                  {:else}
                    <span class="text-gray-400">already tiny</span>
                  {/if}
                  {#if r.note}
                    <span class="text-gray-400">· {r.note}</span>
                  {/if}
                </p>
              </div>
              <button class="dl" on:click={() => downloadBlob(r.blob, r.name)}>
                Download
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Theme switcher (the one fun option) -->
    <div class="themes" role="group" aria-label="Theme">
      {#each THEME_LIST as t}
        <button
          class="theme-dot theme-{t.id}"
          class:on={$theme === t.id}
          title={t.label}
          aria-label={t.label}
          aria-pressed={$theme === t.id}
          on:click={() => applyTheme(t.id)}
        ></button>
      {/each}
    </div>
  </div>

  <svelte:fragment slot="footer-buttons">
    <FooterComponent on:showUnlock={() => (showUnlock = true)} />
  </svelte:fragment>
</PageLayout>

<UnlockModal open={showUnlock} on:close={() => (showUnlock = false)} />

<style>
  .mascot-slot {
    width: 168px;
    height: 168px;
  }

  .drop {
    width: 100%;
    min-height: 168px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    cursor: pointer;
    border-radius: 24px;
    border: 4px dashed rgba(147, 51, 234, 0.4);
    background: rgba(255, 255, 255, 0.45);
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      transform 0.15s ease;
  }
  .drop:hover {
    border-color: rgba(147, 51, 234, 0.7);
  }
  .drop-over {
    border-color: #9333ea;
    background: rgba(244, 114, 182, 0.12);
    transform: scale(1.01);
  }
  .drop-busy {
    border-style: solid;
    border-color: #c026d3;
  }
  .drop-text {
    font-size: 1.25rem;
    font-weight: 800;
    color: #2a2233;
  }
  .drop-sub {
    font-size: 0.85rem;
    color: #8b8194;
  }

  .result {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 16px;
    border: 2px solid rgba(0, 0, 0, 0.08);
    background: #fff;
    padding: 0.75rem 1rem;
  }
  .dl {
    flex-shrink: 0;
    border-radius: 999px;
    background: #9333ea;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 800;
    color: #fff;
    transition: background 0.15s ease;
  }
  .dl:hover {
    background: #7c3aed;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .themes {
    display: flex;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  .theme-dot {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 3px solid rgba(0, 0, 0, 0.12);
    cursor: pointer;
    transition:
      transform 0.12s ease,
      border-color 0.12s ease;
  }
  .theme-dot:hover {
    transform: scale(1.12);
  }
  .theme-dot.on {
    border-color: rgba(0, 0, 0, 0.55);
    transform: scale(1.12);
  }
  .theme-vibrant {
    background: linear-gradient(135deg, #9333ea, #f472b6);
  }
  .theme-warm {
    background: linear-gradient(135deg, #ff7a45, #ffd24c);
  }
  .theme-cool {
    background: linear-gradient(135deg, #0fb5c9, #5fe07a);
  }
  .theme-minimal {
    background: linear-gradient(135deg, #52525b, #a1a1aa);
  }
</style>
