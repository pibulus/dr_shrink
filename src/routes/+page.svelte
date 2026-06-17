<script>
  import { Mascot } from "$lib/components/mascot";
  import {
    compress,
    formatBytes,
    isImage,
    downloadBlob,
  } from "$lib/services/compressService.js";

  let mascot;
  let dragOver = false;
  let busy = false;
  let error = "";
  /** @type {Array<{name,inputSize,outputSize,saved,ratio,blob,grew}>} */
  let results = [];

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    error = "";
    busy = true;
    mascot?.startThinking();

    for (const file of files) {
      try {
        const r = await compress(file);
        results = [r, ...results];
        // Mascot reacts proportionally to how much we saved (kb).
        mascot?.react(Math.round(r.saved / 1024));
      } catch (e) {
        error = e.message;
      }
    }

    busy = false;
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

<svelte:head>
  <title>DrShrink — drop a file, get a smaller one</title>
</svelte:head>

<main class="mx-auto flex min-h-dvh max-w-xl flex-col items-center gap-6 px-6 py-12">
  <div class="mascot-slot">
    <Mascot
      bind:this={mascot}
      character="brain"
      accessory="head-mirror"
      theme="purple"
      {busy}
      ariaLabel="DrShrink"
      on:activate={() => document.getElementById("file-input")?.click()}
    />
  </div>

  <header class="text-center">
    <h1 class="text-5xl font-black tracking-tight text-primary sm:text-6xl">
      DrShrink
    </h1>
    <p class="mt-2 text-lg text-gray-600">
      Drop a file in, get a smaller one out. No settings, no fuss.
    </p>
  </header>

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
      accept="image/*"
      multiple
      class="sr-only"
      on:change={onPick}
    />
    {#if busy}
      <span class="drop-text">Shrinking…</span>
    {:else}
      <span class="drop-text">Drop images here</span>
      <span class="drop-sub">or click to choose · images for now</span>
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
</main>

<style>
  .mascot-slot {
    width: 168px;
    height: 168px;
  }

  .drop {
    width: 100%;
    min-height: 180px;
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
</style>
