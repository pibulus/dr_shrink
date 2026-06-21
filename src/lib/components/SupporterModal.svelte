<script>
  import Modal from "./Modal.svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";
  import {
    isSupporter,
    setSupporter,
    redeemCode,
    daysRemaining,
    LIMITS,
  } from "$lib/services/supporterService.js";
  import { dev } from "$app/environment";

  export let open = false;

  const freeMB = Math.round(LIMITS.free.maxFileBytes / (1024 * 1024));
  const supMB = Math.round(LIMITS.supporter.maxFileBytes / (1024 * 1024));

  let code = "";
  let codeMsg = "";
  let checking = false;

  async function tryCode() {
    const c = code.trim();
    if (!c || checking) return;
    checking = true;
    codeMsg = "checking…";
    const ok = await redeemCode(c);
    codeMsg = ok ? "✓ you're in — thank you!" : "hmm, that code didn't work";
    if (ok) code = "";
    checking = false;
  }
</script>

<Modal {open} title="Become a Contributor" on:close>
  <svelte:fragment slot="icon">
    <ThemeMascot theme={$theme} size="30px" />
  </svelte:fragment>
  {#if $isSupporter}
    <div class="thanks-box">
      <p class="thanks">You're a Contributor — thank you! 💜</p>
      <p class="sub">
        {daysRemaining()} days remaining on your pass. Bigger files, bigger
        batches, and first dibs on new tricks are all yours.
      </p>
    </div>
    {#if dev}
      <button class="ghost" on:click={() => setSupporter(false)}>(dev) turn off</button>
    {/if}
  {:else}
    <p class="pitch">
      DrShrink is free and always will be. Chip in <strong>$9/year</strong>
      and you get more room to work — plus our undying gratitude.
      <a
        class="kofi"
        href="https://ko-fi.com/madebypablo"
        target="_blank"
        rel="noopener noreferrer">☕ Support on Ko-fi</a>
    </p>

    <ul class="perks">
      <li>Bigger files — up to <strong>{supMB} MB</strong> <span class="vs">(free: {freeMB} MB)</span></li>
      <li>Bigger batches — up to <strong>{LIMITS.supporter.maxBatch}</strong> files at once</li>
      <li>First crack at new formats — PDF, video &amp; more</li>
      <li>A warm fuzzy feeling, and our thanks 💜</li>
    </ul>

    <a
      class="cta"
      href="https://ko-fi.com/madebypablo"
      target="_blank"
      rel="noopener noreferrer"
    >
      Become a Contributor — $9/yr
    </a>

    <div class="code">
      <label for="contrib-code">Have a contributor code?</label>
      <div class="code-row">
        <input
          id="contrib-code"
          type="text"
          bind:value={code}
          placeholder="DS-word-word-word-word"
          on:keydown={(e) => e.key === "Enter" && tryCode()}
        />
        <button class="redeem" on:click={tryCode} disabled={!code.trim() || checking}>Redeem</button>
      </div>
      {#if codeMsg}<p class="code-msg">{codeMsg}</p>{/if}
      <p class="code-hint">Codes are for gifts and your other devices.</p>
    </div>

    {#if dev}
      <button class="ghost" on:click={() => setSupporter(true)}>(dev) simulate</button>
    {/if}
  {/if}

  <p class="fine">No accounts. No tracking. Files never leave your device.</p>
</Modal>

<style>
  .pitch { margin-bottom: 0.9rem; }
  .pitch strong { color: var(--ds-ink, #1f2937); }
  .kofi {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ds-accent-color, #c026d3);
  }
  .kofi:hover { text-decoration: underline; }
  .perks {
    margin: 0 0 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
  .perks strong { color: var(--ds-ink, #1f2937); }
  .vs { color: #9b9199; font-size: 0.85em; }
  .cta {
    display: inline-block;
    width: 100%;
    text-align: center;
    text-decoration: none;
    border-radius: 999px;
    background: var(--ds-primary-color, #9333ea);
    color: #fff;
    font-weight: 800;
    padding: 0.78rem 1rem;
    transition: filter 0.15s ease;
  }
  .cta:hover { filter: brightness(1.08); }

  .code { margin-top: 1.1rem; }
  .code label { font-size: 0.85rem; font-weight: 700; color: var(--ds-ink, #1f2937); }
  .code-row { display: flex; gap: 0.5rem; margin-top: 0.4rem; }
  .code-row input {
    flex: 1;
    border: 2px solid rgba(0, 0, 0, 0.12);
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
    background: #fff;
  }
  .code-row input:focus {
    outline: none;
    border-color: var(--ds-primary-color, #9333ea);
  }
  .redeem {
    border-radius: 10px;
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.12);
    color: var(--ds-primary-color, #9333ea);
    font-weight: 700;
    font-size: 0.85rem;
    padding: 0 0.9rem;
  }
  .redeem:disabled { opacity: 0.4; cursor: default; }
  .code-msg { font-size: 0.8rem; margin-top: 0.4rem; color: var(--ds-accent-color, #c026d3); font-weight: 600; }
  .code-hint { font-size: 0.72rem; color: #9b9199; margin-top: 0.3rem; }

  .thanks-box {
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.08);
    border-radius: 14px;
    padding: 1rem;
    text-align: center;
  }
  .thanks { font-weight: 800; color: var(--ds-accent-color, #c026d3); }
  .sub { font-size: 0.85rem; color: #6b6671; margin-top: 0.3rem; }
  .ghost {
    display: block;
    margin: 0.7rem auto 0;
    font-size: 0.75rem;
    color: #c9c2cc;
    text-decoration: underline;
  }
  .fine {
    margin-top: 1rem;
    font-size: 0.72rem;
    color: #a99fb6;
    text-align: center;
  }
</style>
