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
  import { theme } from "$lib";
  import { isSupporter, checkDrop } from "$lib/services/supporterService.js";
  import UnlockModal from "$lib/components/UnlockModal.svelte";
  import AboutModal from "$lib/components/AboutModal.svelte";
  import OptionsModal from "$lib/components/OptionsModal.svelte";
  import {
    history,
    recordHistory,
    clearHistory,
  } from "$lib/services/historyService.js";
  import { tick, onDestroy } from "svelte";
  import {
    soundDrop,
    soundShrink,
    soundDone,
    soundError,
  } from "$lib/services/soundService.js";

  let mascot;
  let dragOver = false;
  let error = "";
  let showUnlock = false;
  let showAbout = false;
  let showOptions = false;
  /** @type {Array<{name,inputSize,outputSize,saved,ratio,blob,grew,note}>} */
  let results = [];

  // Fused drop-zone state: idle | busy | done
  let phase = "idle";
  let busyLabel = "Shrinking…";
  let progress = 0; // 0..1, determinate
  let determinate = false; // true when we have real progress (audio)
  let toast = ""; // "Saved 4.6 MB 🎉"
  let toastTimer = null;

  // ── Shrinking dopamine ──
  // squeeze: mascot squishes while crunching. pop: a scaled bounce on landing.
  // popScale grows with how hard we crushed, so a 90% save feels bigger than 5%.
  let popping = false; // toggles the one-shot bounce on landing
  let popScale = 1; // 1..~1.18 — bigger crush, bigger bounce
  let popTimer = null;
  let displaySaved = 0; // count-up value for the total (bytes)
  let countRaf = null;

  $: busy = phase === "busy";
  $: squeezing = busy; // drives the CSS squish on the mascot slot

  // Tween the "saved total" counter up to its real value — watching the number
  // shrink your file is half the reward.
  function countUpTo(target) {
    if (countRaf) cancelAnimationFrame(countRaf);
    const start = displaySaved;
    const t0 = performance.now();
    const dur = 650;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic
      displaySaved = start + (target - start) * eased;
      if (k < 1) countRaf = requestAnimationFrame(step);
      else displaySaved = target;
    };
    countRaf = requestAnimationFrame(step);
  }

  async function popMascot(ratioSaved) {
    popScale = 1 + Math.max(0, Math.min(1, ratioSaved)) * 0.18;
    popping = false;
    await tick(); // drop the class so re-adding it restarts the animation
    popping = true;
    if (popTimer) clearTimeout(popTimer);
    popTimer = setTimeout(() => (popping = false), 600);
  }

  function setToast(msg) {
    toast = msg;
    phase = "done";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (phase === "done") phase = "idle";
    }, 2600);
  }

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    error = "";

    // Supporter gate (size / batch limits)
    const gate = checkDrop(files, $isSupporter);
    if (!gate.ok) {
      error = gate.reason;
      soundError();
      if (gate.gated) showUnlock = true;
      return;
    }

    soundDrop();
    soundShrink(); // the descending "squeeze" whoosh as crunching begins
    phase = "busy";
    progress = 0;
    determinate = false;
    busyLabel = files.length > 1 ? "Zipping…" : "Shrinking…";
    mascot?.startThinking();

    try {
      const out = await compress(files, {
        onProgress: (p) => {
          determinate = true;
          progress = p;
          busyLabel = `Crunching… ${Math.round(p * 100)}%`;
        },
      });
      let saved = 0;
      let inputTotal = 0;
      for (const r of out) {
        results = [r, ...results];
        recordHistory(r);
        saved += Math.max(0, r.saved);
        inputTotal += r.inputSize || 0;
        mascot?.react(Math.round(Math.max(0, r.saved) / 1024));
      }
      progress = 1;
      // ratio of the whole batch that we shaved off — drives pop + sound size
      const ratioSaved = inputTotal > 0 ? saved / inputTotal : 0;
      setToast(saved > 0 ? `Saved ${formatBytes(saved)} 🎉` : "Done ✨");
      soundDone(ratioSaved);
      popMascot(ratioSaved);
      countUpTo(results.reduce((a, r) => a + Math.max(0, r.saved), 0));
    } catch (e) {
      error = e.message;
      phase = "idle";
      soundError();
    }

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

  onDestroy(() => {
    if (countRaf) cancelAnimationFrame(countRaf);
    if (popTimer) clearTimeout(popTimer);
    if (toastTimer) clearTimeout(toastTimer);
  });
</script>

<PageLayout>
  <div class="flex w-full flex-col items-center gap-5">
    <div
      class="mascot-slot"
      class:squeezing
      class:popping
      style="--pop-scale: {popScale}"
    >
      <Mascot
        bind:this={mascot}
        character="brain"
        theme={$theme}
        {busy}
        ariaLabel="DrShrink — choose a file"
        on:activate={() => document.getElementById("file-input")?.click()}
      />
    </div>

    <AnimatedTitle />

    <!-- Drop zone — fused with progress + toast (TalkType pattern) -->
    <label
      for="file-input"
      class="drop"
      class:drop-over={dragOver}
      class:drop-busy={phase === "busy"}
      class:drop-done={phase === "done"}
      style="--progress: {Math.round(progress * 100)}%"
      on:dragover|preventDefault={() => (dragOver = true)}
      on:dragleave={() => (dragOver = false)}
      on:drop={onDrop}
    >
      <input
        id="file-input"
        type="file"
        multiple
        class="sr-only"
        aria-label="Choose files to shrink"
        on:change={onPick}
      />

      <!-- progress fill sweeps across the zone -->
      <span
        class="drop-fill"
        class:indeterminate={phase === "busy" && !determinate}
        aria-hidden="true"
      ></span>

      <!-- center text swaps per phase -->
      <span class="drop-content">
        {#if phase === "busy"}
          <span class="drop-text">{busyLabel}</span>
        {:else if phase === "done"}
          <span class="drop-text">{toast}</span>
        {:else}
          <span class="drop-text">Drop anything in</span>
          <span class="drop-sub">photos · audio · docs · text · a whole pile → zip</span>
        {/if}
      </span>
    </label>

    {#if error}
      <p class="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
        {error}
      </p>
    {/if}

    {#if results.length}
      <div class="w-full">
        <p class="mb-2 text-center text-sm font-bold text-accent">
          Saved {formatBytes(Math.round(displaySaved))} total 🎉
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

    <!-- History — recent jobs (stats persist across reloads; files don't) -->
    {#if $history.length}
      <details class="history">
        <summary>
          <span>Recent ({$history.length})</span>
          <button
            class="clear"
            on:click|preventDefault|stopPropagation={clearHistory}
          >clear</button>
        </summary>
        <ul>
          {#each $history as h}
            <li>
              <span class="h-name" title={h.name}>{h.name}</span>
              <span class="h-stat">
                {formatBytes(h.inputSize)} → {formatBytes(h.outputSize)}
                {#if !h.grew}<span class="h-pct">−{h.pct}%</span>{/if}
              </span>
            </li>
          {/each}
        </ul>
      </details>
    {/if}

  </div>

  <svelte:fragment slot="footer-buttons">
    <FooterComponent
      on:showAbout={() => (showAbout = true)}
      on:showOptions={() => (showOptions = true)}
      on:showUnlock={() => (showUnlock = true)}
    />
  </svelte:fragment>
</PageLayout>

<AboutModal open={showAbout} on:close={() => (showAbout = false)} />
<OptionsModal open={showOptions} on:close={() => (showOptions = false)} />
<UnlockModal open={showUnlock} on:close={() => (showUnlock = false)} />

<style>
  .mascot-slot {
    /* big hero mascot, matching talktype/ziplist (~256px desktop) */
    width: clamp(180px, 42vw, 256px);
    height: clamp(180px, 42vw, 256px);
    transform-origin: center bottom;
    will-change: transform;
  }

  /* SQUEEZE — while crunching, the little guy gets compressed: squashes wide
     and short, springs back, on a loop. Reads as "pressing the data flat." */
  .mascot-slot.squeezing {
    animation: dr-squeeze 0.7s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  }
  @keyframes dr-squeeze {
    0%,
    100% {
      transform: scale(1, 1) translateY(0);
    }
    45% {
      transform: scale(1.1, 0.82) translateY(6%);
    }
    70% {
      transform: scale(0.97, 1.04) translateY(-2%);
    }
  }

  /* POP — on landing, a scaled bounce. --pop-scale grows with how hard we
     crushed, so a 90% save visibly out-bounces a 5% one. */
  .mascot-slot.popping {
    animation: dr-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes dr-pop {
    0% {
      transform: scale(0.9, 1.06);
    }
    40% {
      transform: scale(var(--pop-scale, 1.12), calc(2 - var(--pop-scale, 1.12)));
    }
    100% {
      transform: scale(1, 1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mascot-slot.squeezing,
    .mascot-slot.popping {
      animation: none;
    }
  }

  .drop {
    position: relative;
    overflow: hidden;
    width: 100%;
    min-height: 168px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    cursor: pointer;
    border-radius: 24px;
    border: 4px dashed rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.4);
    background: rgba(255, 255, 255, 0.45);
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      transform 0.15s ease;
  }
  .drop:hover {
    border-color: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.7);
  }
  .drop-over {
    border-color: var(--ds-primary-color, #9333ea);
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.1);
    transform: scale(1.01);
  }
  .drop-busy {
    border-style: solid;
    border-color: var(--ds-accent-color, #c026d3);
  }
  .drop-done {
    border-style: solid;
    border-color: var(--ds-accent-color, #c026d3);
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.06);
  }

  /* the sweeping progress fill (behind the text) */
  .drop-fill {
    position: absolute;
    inset: 0;
    width: var(--progress, 0%);
    background: linear-gradient(
      90deg,
      rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.18),
      rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.32)
    );
    transition: width 0.3s ease;
    pointer-events: none;
  }
  /* fast/unknown-length ops: a gentle indeterminate shimmer across the whole zone */
  .drop-fill.indeterminate {
    width: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.22) 50%,
      transparent 100%
    );
    background-size: 220% 100%;
    animation: drop-shimmer 1.1s ease-in-out infinite;
  }
  @keyframes drop-shimmer {
    0% {
      background-position: 120% 0;
    }
    100% {
      background-position: -120% 0;
    }
  }

  .drop-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    text-align: center;
    /* keep the whole zone one drag target — no dragleave flicker over the text */
    pointer-events: none;
  }
  .drop-text {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--ds-ink, #2a2233);
  }
  .drop-sub {
    font-size: 0.85rem;
    color: #8b8194;
  }

  @media (prefers-reduced-motion: reduce) {
    .drop-fill.indeterminate {
      animation: none;
    }
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

  /* History */
  .history {
    width: 100%;
    font-size: 0.85rem;
  }
  .history summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    list-style: none;
    padding: 0.5rem 0.25rem;
    color: #8b8194;
    font-weight: 700;
    user-select: none;
  }
  .history summary::-webkit-details-marker {
    display: none;
  }
  .history .clear {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ds-accent-color, #c026d3);
    text-decoration: underline;
  }
  .history ul {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.25rem 0;
  }
  .history li {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    color: #6b6671;
  }
  .h-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .h-stat {
    flex-shrink: 0;
    color: #9b9199;
  }
  .h-pct {
    font-weight: 700;
    color: #16a34a;
  }
</style>
