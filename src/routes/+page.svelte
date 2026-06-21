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
  import { cacheId, putCache } from "$lib/services/blobCache.js";
  import { theme } from "$lib";
  import { isSupporter, checkDrop } from "$lib/services/supporterService.js";
  import SupporterModal from "$lib/components/SupporterModal.svelte";
  import AboutModal from "$lib/components/AboutModal.svelte";
  import OptionsModal from "$lib/components/OptionsModal.svelte";
  import ShrinkConfetti from "$lib/components/ShrinkConfetti.svelte";
  import {
    history,
    recordHistory,
    clearHistory,
    retryDownload,
  } from "$lib/services/historyService.js";
  import { tick, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    soundDrop,
    soundShrink,
    soundDone,
    soundError,
    soundTickle,
  } from "$lib/services/soundService.js";
  import {
    dropSubtitle,
    crunchLabel,
    maybeCrunchQuip,
    doneToast,
    isBigWin,
    refuseLine,
    tickleQuip,
    TICKLE_THRESHOLD,
    TICKLE_WINDOW,
  } from "$lib/services/delightService.js";

  let mascot;
  let confetti; // ShrinkConfetti instance — burst() on big wins
  let mascotSlotEl; // for locating the burst origin
  let dragOver = false;
  let mascotDragOver = false; // files hovering over the mascot itself
  let mascotDragCount = 0; // counter to avoid flicker from child elements
  let catching = false; // brief catch animation on drop
  let pulseInterval = null; // rhythmic pulse during processing
  let error = "";
  let showSupport = false;
  let showAbout = false;
  let showOptions = false;
  /** @type {Array<{name,inputSize,outputSize,saved,ratio,blob,grew,note}>} */
  let results = [];
  let autoDownload = browser
    ? localStorage.getItem("drshrink-auto-download") !== "false"
    : true;

  function toggleAutoDownload() {
    autoDownload = !autoDownload;
    localStorage.setItem(
      "drshrink-auto-download",
      autoDownload ? "true" : "false",
    );
  }

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

  // ── Delight: randomized copy + the tickle easter egg ──
  let subtitle = dropSubtitle(); // rolls on load, re-rolls each return to idle
  let eggQuip = ""; // little speech-bubble over the mascot ("hehe", "🤯 vaporized")
  let eggTimer = null;
  let tickleCount = 0;
  let tickleResetTimer = null;

  $: busy = phase === "busy";
  $: squeezing = busy; // drives the CSS squish on the mascot slot

  function flashEgg(msg, ms = 1400) {
    eggQuip = msg;
    if (eggTimer) clearTimeout(eggTimer);
    eggTimer = setTimeout(() => (eggQuip = ""), ms);
  }

  // Fire confetti from the doctor's head — the big-win payoff.
  function celebrate() {
    const el = mascotSlotEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    confetti?.burst(r.left + r.width / 2, r.top + r.height * 0.35);
  }

  // A click on the doctor normally opens the file picker. But rapid-fire pokes
  // are a tickle, not "open the dialog 5 times" — so once a fast streak builds,
  // we swallow the picker and giggle instead. Returns true if the picker should
  // still open (i.e. this was a normal, deliberate click).
  let lastPokeAt = 0;
  function onMascotPoke() {
    const now = performance.now();
    const fast = now - lastPokeAt < 450; // came hot on the heels of the last
    lastPokeAt = now;

    if (fast) tickleCount += 1;
    else tickleCount = 1;
    if (tickleResetTimer) clearTimeout(tickleResetTimer);
    tickleResetTimer = setTimeout(() => (tickleCount = 0), TICKLE_WINDOW);

    if (tickleCount >= TICKLE_THRESHOLD) {
      tickleCount = 0;
      soundTickle();
      flashEgg(tickleQuip());
      mascot?.react(120); // a happy blink burst
      return false; // it's a tickle — don't open the picker
    }
    // Suppress the picker for the fast in-between pokes too, so a tickle streak
    // doesn't fling open a stack of dialogs. A calm single click still opens it.
    return !fast;
  }

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

  async function popMascot(ratioSaved, isBig) {
    // big wins bounce harder, on top of the ratio scaling
    popScale = 1 + Math.max(0, Math.min(1, ratioSaved)) * 0.18 + (isBig ? 0.12 : 0);
    popping = false;
    await tick(); // drop the class so re-adding it restarts the animation
    popping = true;
    if (popTimer) clearTimeout(popTimer);
    popTimer = setTimeout(() => (popping = false), 720);
  }

  function setToast(msg) {
    toast = msg;
    phase = "done";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (phase === "done") {
        phase = "idle";
        subtitle = dropSubtitle(); // fresh line for next time
      }
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
      if (gate.gated) showSupport = true;
      return;
    }

    soundDrop();
    soundShrink(); // the descending "squeeze" whoosh as crunching begins
    phase = "busy";
    progress = 0;
    determinate = false;
    const quip = maybeCrunchQuip(); // 1-in-4 runs get a flavor line
    busyLabel = files.length > 1 ? "Zipping…" : "Shrinking…";
    mascot?.startThinking();
    if (pulseInterval) clearInterval(pulseInterval);
    pulseInterval = setInterval(() => mascot?.pulse(), 1200);

    try {
      const out = await compress(files, {
        onProgress: (p) => {
          determinate = true;
          progress = p;
          busyLabel = crunchLabel(Math.round(p * 100), quip);
        },
      });
      let saved = 0;
      let inputTotal = 0;
      for (const r of out) {
        const id = cacheId();
        putCache(id, r.name, r.type, r.blob).catch(() => {});
        results = [{ ...r, blobId: id }, ...results].slice(0, 25);
        recordHistory(r, id);
        saved += Math.max(0, r.saved);
        inputTotal += r.inputSize || 0;
        mascot?.react(Math.round(Math.max(0, r.saved) / 1024));
        if (autoDownload) downloadBlob(r.blob, r.name);
      }
      progress = 1;
      // ratio of the whole batch that we shaved off — drives pop + sound size
      const ratioSaved = inputTotal > 0 ? saved / inputTotal : 0;
      const bigWin = isBigWin(saved, ratioSaved);
      // Nothing shrank (everything was already compressed) → deadpan doctor line
      const allGrew = out.length > 0 && out.every((r) => r.grew);
      setToast(
        allGrew ? refuseLine() : doneToast(saved, ratioSaved, formatBytes),
      );
      if (bigWin) {
        flashEgg("🤯", 1600); // little blast over the head on huge wins
        celebrate(); // 🎊 emoji confetti from the doctor
      }
      soundDone(ratioSaved);
      popMascot(ratioSaved, bigWin);
      countUpTo(results.reduce((a, r) => a + Math.max(0, r.saved), 0));
    } catch (e) {
      error = e.message;
      phase = "idle";
      soundError();
    }

    mascot?.stopThinking();
    if (pulseInterval) {
      clearInterval(pulseInterval);
      pulseInterval = null;
    }
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
    if (eggTimer) clearTimeout(eggTimer);
    if (tickleResetTimer) clearTimeout(tickleResetTimer);
    if (pulseInterval) clearInterval(pulseInterval);
  });
</script>

<PageLayout>
  <div class="flex w-full flex-col items-center gap-8">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={mascotSlotEl}
      class="mascot-slot h-44 w-44 sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64"
      class:squeezing
      class:popping
      class:catching
      class:mascot-drag-over={mascotDragOver}
      style="--pop-scale: {popScale}"
      on:dragenter={(e) => {
        e.preventDefault();
        mascotDragCount++;
        mascotDragOver = true;
      }}
      on:dragleave={() => {
        mascotDragCount--;
        if (mascotDragCount <= 0) {
          mascotDragCount = 0;
          mascotDragOver = false;
        }
      }}
      on:dragover|preventDefault
      on:drop={(e) => {
        e.preventDefault();
        mascotDragCount = 0;
        mascotDragOver = false;
        catching = true;
        setTimeout(() => (catching = false), 380);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {#if eggQuip}
        <span class="egg-bubble" aria-hidden="true">{eggQuip}</span>
      {/if}
      <Mascot
        bind:this={mascot}
        character="brain"
        theme={$theme}
        {busy}
        ariaLabel="DrShrink — choose a file"
        on:activate={() => {
          if (onMascotPoke()) document.getElementById("file-input")?.click();
        }}
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
          <span class="drop-sub">{subtitle}</span>
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
              {#if h.blobId}
                <button
                  class="h-dl"
                  title="Re-download"
                  aria-label="Re-download {h.name}"
                  on:click={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cached = await retryDownload(h);
                    if (cached) downloadBlob(cached.blob, cached.name);
                  }}>↓</button>
              {/if}
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
      on:showSupport={() => (showSupport = true)}
    />
  </svelte:fragment>
</PageLayout>

<AboutModal open={showAbout} on:close={() => (showAbout = false)} />
<OptionsModal 
  open={showOptions} 
  on:close={() => (showOptions = false)} 
  {autoDownload}
  onToggleAuto={toggleAutoDownload}
/>
<SupporterModal open={showSupport} on:close={() => (showSupport = false)} />

<ShrinkConfetti bind:this={confetti} />

<style>
  .mascot-slot {
    /* big hero mascot, matching talktype/ziplist — canonical responsive ramp:
       h-44 w-44 → lg:h-64/w-64 (~176px base → 256px desktop) via Tailwind classes
       in the markup. Inner Mascot SVG fills 100% of the slot. */
    position: relative;
    transform-origin: center bottom;
    will-change: transform;
    /* breathe more — the portable engine reads these float vars. A bigger,
       slower drift makes the doctor feel alive (hovering / gently breathing). */
    --mascot-float-y: -7px;
    --mascot-float-x: 1.5px;
    --mascot-float-tilt: 0.9deg;
    --mascot-float-scale: 1.012;
    --mascot-float-speed: 4.6s;
  }

  /* GLOW — DrShrink themes aren't the portable kit's theme names, so the kit's
     built-in glow doesn't fire here. Drive it ourselves off the accent color,
     on hover and while crunching. */
  .mascot-slot :global(.mascot-svg) {
    transition: filter 0.35s ease;
  }
  .mascot-slot:hover :global(.mascot-svg),
  .mascot-slot.squeezing :global(.mascot-svg) {
    filter: drop-shadow(
        0 0 16px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.55)
      )
      drop-shadow(0 0 30px rgba(var(--ds-accent-color-rgb, 192, 38, 211), 0.32));
  }
  /* while crunching, let the glow gently pulse to feel "at work" */
  .mascot-slot.squeezing :global(.mascot-svg) {
    animation: dr-glow-pulse 1.4s ease-in-out infinite;
  }
  @keyframes dr-glow-pulse {
    0%,
    100% {
      filter: drop-shadow(
          0 0 12px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.4)
        )
        drop-shadow(0 0 22px rgba(var(--ds-accent-color-rgb, 192, 38, 211), 0.22));
    }
    50% {
      filter: drop-shadow(
          0 0 22px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.7)
        )
        drop-shadow(0 0 38px rgba(var(--ds-accent-color-rgb, 192, 38, 211), 0.4));
    }
  }

  /* DRAG-OVER — files hovering over the doctor: scale up + intense multi-layer glow */
  .mascot-slot.mascot-drag-over :global(.mascot-svg) {
    transform: scale(1.07);
    filter: drop-shadow(
        0 0 24px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.75)
      )
      drop-shadow(0 0 48px rgba(var(--ds-accent-color-rgb, 192, 38, 211), 0.5))
      drop-shadow(0 0 72px rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.25));
    transition:
      transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.28s ease;
  }

  /* CATCH — quick squish on drop, like the doctor caught the files */
  .mascot-slot.catching {
    animation: dr-catch 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes dr-catch {
    0% {
      transform: scale(1);
    }
    35% {
      transform: scale(0.86, 1.1) translateY(3%);
    }
    100% {
      transform: scale(1);
    }
  }

  /* little speech bubble that pops over the doctor's head (tickle / 🤯) */
  .egg-bubble {
    position: absolute;
    top: -0.25rem;
    left: 50%;
    z-index: 3;
    transform: translateX(-50%);
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--ds-ink, #2a2233);
    white-space: nowrap;
    pointer-events: none;
    animation: egg-rise 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes egg-rise {
    from {
      opacity: 0;
      transform: translate(-50%, 6px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
    }
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

  /* POP — on landing, a real spring (Comeau linear() physics, not a bezier).
     The spring curve drives 0→1 progress with overshoot + wobble; the keyframe
     squishes to --pop-scale at the midpoint then springs home. Bigger crush →
     bigger --pop-scale → a bouncier landing. */
  .mascot-slot.popping {
    animation: dr-pop 0.7s
      linear(
        0,
        0.402 7.4%,
        1.18 18.4%,
        1.298 23.5%,
        1.248 31.5%,
        0.9 47.1%,
        0.965 58.5%,
        1.013 70.1%,
        1.002 89.3%,
        1
      );
  }
  @keyframes dr-pop {
    0% {
      transform: scale(0.92, 1.06);
    }
    45% {
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
    .drop:active,
    .dl:active,
    .dl:hover {
      transform: none;
    }
    .mascot-slot.squeezing :global(.mascot-svg) {
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
  /* micro-bounce — tactile squish on press (Comeau one-liner) */
  .drop:active {
    transform: scale(0.985);
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
    transition:
      background 0.15s ease,
      transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .dl:hover {
    background: #7c3aed;
    transform: translateY(-1px);
  }
  .dl:active {
    transform: scale(0.94);
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
  .h-dl {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.12);
    color: var(--ds-primary-color, #9333ea);
    font-size: 0.75rem;
    font-weight: 800;
    line-height: 1;
    transition:
      background 0.15s ease,
      transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .h-dl:hover {
    background: var(--ds-primary-color, #9333ea);
    color: #fff;
    transform: translateY(-1px);
  }
  .h-dl:active {
    transform: scale(0.88);
  }
</style>
