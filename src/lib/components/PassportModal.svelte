<script>
  // The Passport: one payment, every dial, nothing to renew.
  // Views: pitch (free) · redeem (passkey) · ready (unlocked).
  import { createEventDispatcher, tick } from "svelte";
  import Modal from "./Modal.svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";
  import { PRICING } from "$lib/config/pricing.js";
  import {
    isSupporter,
    passportCode,
    passportPhrase,
    startCheckout,
    redeemCode,
    unlockUrl,
    SUPPORT_URL,
  } from "$lib/services/supporterService.js";

  export let open = false;
  // footer | about | options | limit | link | manual
  export let source = "manual";

  const dispatch = createEventDispatcher();

  let view = "pitch"; // pitch | redeem
  let busy = false;
  let status = ""; // inline line under the CTA / form
  let statusKind = "soft"; // soft | good
  let code = "";
  let inputEl;
  let copied = "";
  let copyTimer = null;

  $: if (!open) {
    // reset on close so the next open starts clean
    view = "pitch";
    busy = false;
    status = "";
    code = "";
  }

  async function checkout() {
    busy = true;
    status = "";
    try {
      await startCheckout();
      // navigates away on success
    } catch (e) {
      statusKind = "soft";
      status = e?.message || "Checkout is napping. Passkeys still work.";
      busy = false;
    }
  }

  async function showRedeem() {
    view = "redeem";
    status = "";
    await tick();
    inputEl?.focus();
  }

  async function redeem() {
    if (!code.trim() || busy) return;
    busy = true;
    status = "";
    const r = await redeemCode(code);
    busy = false;
    if (r.ok) {
      statusKind = "good";
      status = "Passport ready.";
      code = "";
    } else {
      statusKind = "soft";
      status = r.reason || "That passkey didn't match.";
    }
  }

  async function copy() {
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

  $: mailto = (() => {
    const body = [
      "DrShrink Passport",
      "",
      `Code: ${$passportCode}`,
      `Passkey: ${$passportPhrase}`,
      `One-tap unlock: ${unlockUrl()}`,
      "",
      "Permanent. Works on any device that opens the link or types the four words.",
    ].join("\n");
    return `mailto:?subject=${encodeURIComponent("DrShrink Passport")}&body=${encodeURIComponent(body)}`;
  })();
</script>

<Modal {open} pitch labelledBy="passport-title" on:close>
  <div class="ds-pitch">
    <div class="ds-pitch-mascot" class:small={view === "redeem"} aria-hidden="true">
      <ThemeMascot theme={$theme} size="100%" />
    </div>

    {#if $isSupporter}
      <!-- READY -->
      <div class="ds-pitch-head">
        <h2 id="passport-title" class="ds-headline">
          Passport <span class="ds-marker">ready.</span>
        </h2>
        <p class="ds-accent-sub">Every dial is open. Nothing to renew.</p>
      </div>

      <div class="ds-card pass-card">
        {#if $passportCode}<p class="ds-code">{$passportCode}</p>{/if}
        {#if $passportPhrase}<p class="phrase">{$passportPhrase}</p>{/if}
        <p class="ds-fine">
          The four words open the Passport on any other device.
        </p>
      </div>

      <div class="actions">
        <button class="ds-pitch-secondary" type="button" on:click={copy}>
          {copied || "Copy unlock link"}
        </button>
        <a class="ds-pitch-secondary" href={mailto}>Email this passkey</a>
        <button class="ds-pitch-cta" type="button" on:click={() => dispatch("close")}>
          Back to shrinking
        </button>
      </div>
    {:else if view === "redeem"}
      <!-- REDEEM -->
      <div class="ds-pitch-head">
        <h2 id="passport-title" class="ds-headline">
          <span class="ds-marker">Passkey.</span>
        </h2>
        <p class="ds-accent-sub">Four words or the DS code.</p>
      </div>

      <form class="ds-code-form" on:submit|preventDefault={redeem}>
        <label class="ds-code-label" for="passkey-input">Passkey</label>
        <input
          id="passkey-input"
          class="ds-code-input"
          bind:this={inputEl}
          bind:value={code}
          type="text"
          maxlength="64"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          placeholder="e.g. mossy otter drifts midnight"
        />
        <button class="ds-pitch-cta" type="submit" disabled={busy || !code.trim()}>
          {busy ? "Checking" : "Unlock"}
        </button>
        {#if status}
          <p class="ds-status {statusKind}" role="status">{status}</p>
        {/if}
        <p class="ds-fine">The passkey is on the Passport card and in the receipt email.</p>
      </form>

      <button class="ds-pitch-secondary is-link" type="button" on:click={() => (view = "pitch")}>
        ← Back
      </button>
    {:else}
      <!-- PITCH -->
      <div class="ds-pitch-head">
        <h2 id="passport-title" class="ds-headline">
          Every dial, <span class="ds-marker">once.</span>
        </h2>
        <p class="ds-accent-sub">
          {source === "limit"
            ? "That drop is past the free ceiling."
            : "One payment. Every dial. Nothing to renew."}
        </p>
      </div>

      <ul class="ds-pitch-list ds-pitch-copy">
        <li>Output format: WebP, JPEG, PNG or AVIF.</li>
        <li>Three quality presets, zero sliders.</li>
        <li>Fit under 8, 10 or 25 MB for mail and chat.</li>
        <li>Audio out of video, loose batches, longer memory.</li>
        <li>Ceilings up to 500 MB a file, 200 files a drop.</li>
      </ul>

      <div class="actions">
        <button class="ds-pitch-cta" type="button" disabled={busy} on:click={checkout}>
          {busy ? "Opening Square" : `Grab the Passport · ${PRICING.displayPrice}`}
        </button>
        <p class="price-line">{PRICING.priceLine}</p>
        {#if status}
          <p class="ds-status {statusKind}" role="status">{status}</p>
        {/if}
        <button class="ds-pitch-secondary is-link" type="button" on:click={showRedeem}>
          I have a passkey
        </button>
      </div>

      <p class="ds-fine">
        Or just a coffee:
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">Ko-fi</a>
      </p>
    {/if}
  </div>
</Modal>

<style>
  .ds-pitch-mascot.small {
    width: 3.25rem;
    height: 3.25rem;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .price-line {
    text-align: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--ds-muted, #6b6671);
  }
  .pass-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-align: center;
  }
  .pass-card .ds-code {
    font-size: 1.15rem;
  }
  .phrase {
    font-size: 1rem;
    font-weight: 800;
    color: var(--ds-primary-color, #9333ea);
  }
</style>
