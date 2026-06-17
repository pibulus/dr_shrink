<script>
  import { createEventDispatcher } from "svelte";
  import { isSupporter, setSupporter, LIMITS } from "$lib/services/supporterService.js";

  export let open = false;
  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
  }

  const freeMB = Math.round(LIMITS.free.maxFileBytes / (1024 * 1024));
  const supMB = Math.round(LIMITS.supporter.maxFileBytes / (1024 * 1024));
</script>

{#if open}
  <div
    class="overlay"
    role="button"
    tabindex="-1"
    on:click={close}
    on:keydown={(e) => e.key === "Escape" && close()}
  >
    <div
      class="card"
      role="dialog"
      aria-modal="true"
      aria-label="Unlock DrShrink"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <button class="x" on:click={close} aria-label="Close">×</button>

      <h2 class="title">Unlock DrShrink</h2>
      <p class="price"><strong>$9</strong> / year</p>

      <ul class="perks">
        <li>Bigger files — up to {supMB} MB (free: {freeMB} MB)</li>
        <li>Bigger batches — up to {LIMITS.supporter.maxBatch} at once</li>
        <li>First crack at new formats (PDF, video…)</li>
        <li>Keep a tiny indie tool alive 💜</li>
      </ul>

      {#if $isSupporter}
        <p class="thanks">You're a supporter — thank you! 💜</p>
        <button class="ghost" on:click={() => setSupporter(false)}>
          (dev) turn off
        </button>
      {:else}
        <button class="cta" on:click={() => alert("Checkout coming soon!")}>
          Unlock — $9/yr
        </button>
        <button class="ghost" on:click={() => setSupporter(true)}>
          (dev) simulate supporter
        </button>
      {/if}

      <p class="fine">No accounts. No tracking. Files never leave your device.</p>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgba(20, 10, 30, 0.45);
    backdrop-filter: blur(3px);
  }
  .card {
    width: 100%;
    max-width: 360px;
    border-radius: 24px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    background: #fff;
    padding: 1.75rem 1.5rem 1.25rem;
    text-align: center;
    position: relative;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }
  .x {
    position: absolute;
    top: 0.6rem;
    right: 0.9rem;
    font-size: 1.5rem;
    line-height: 1;
    color: #9b8fae;
  }
  .title {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--ds-primary-color, #9333ea);
  }
  .price {
    margin-top: 0.15rem;
    color: #6b6b72;
  }
  .price strong {
    font-size: 1.6rem;
    color: #2a2233;
  }
  .perks {
    text-align: left;
    margin: 1rem 0 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.92rem;
    color: #4a4452;
  }
  .perks li {
    list-style: none;
    padding-left: 1.5rem;
    position: relative;
  }
  .perks li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--ds-accent-color, #c026d3);
    font-weight: 900;
  }
  .cta {
    width: 100%;
    border-radius: 999px;
    background: var(--ds-primary-color, #9333ea);
    color: #fff;
    font-weight: 800;
    padding: 0.75rem 1rem;
    transition: filter 0.15s ease;
  }
  .cta:hover {
    filter: brightness(1.08);
  }
  .thanks {
    font-weight: 700;
    color: var(--ds-accent-color, #c026d3);
    margin-bottom: 0.5rem;
  }
  .ghost {
    margin-top: 0.6rem;
    font-size: 0.78rem;
    color: #b3a9c0;
    text-decoration: underline;
  }
  .fine {
    margin-top: 0.9rem;
    font-size: 0.72rem;
    color: #a99fb6;
  }
</style>
