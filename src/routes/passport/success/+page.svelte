<script>
  // Square lands here after payment. Poll until the webhook marks it paid,
  // then store the Passport and show the code + four words.
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import {
    pollCheckout,
    storePassport,
    unlockUrl,
    passportCode,
    passportPhrase,
  } from "$lib/services/supporterService.js";
  import { MAX_POLLS, POLL_INTERVAL_MS } from "$lib/config/passport.js";
  import ThemeMascot from "$lib/components/ThemeMascot.svelte";
  import { theme } from "$lib";

  let state = "waiting"; // waiting | ready | stalled | error
  let message = "";
  let polls = 0;
  let timer = null;
  let copied = "";

  const checkoutId = $page.url.searchParams.get("checkout_id") || "";

  async function tick() {
    polls += 1;
    try {
      const r = await pollCheckout(checkoutId);
      if (r.status === 200 && r.code) {
        storePassport(r);
        state = "ready";
        return;
      }
      if ([403, 404, 410].includes(r.status)) {
        state = "error";
        message = r.error || "That checkout isn't on file.";
        return;
      }
      // pending, 429, 5xx → keep waiting
    } catch {
      /* transient */
    }
    if (polls >= MAX_POLLS) {
      state = "stalled";
      return;
    }
    timer = setTimeout(tick, POLL_INTERVAL_MS);
  }

  onMount(() => {
    if (!checkoutId) {
      state = "error";
      message = "No checkout in this link.";
      return;
    }
    tick();
  });
  onDestroy(() => timer && clearTimeout(timer));

  function retry() {
    polls = 0;
    state = "waiting";
    tick();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(unlockUrl() || $passportCode);
      copied = "Copied";
    } catch {
      copied = "Copy blocked here";
    }
    setTimeout(() => (copied = ""), 1800);
  }

  $: mailto = `mailto:?subject=${encodeURIComponent("DrShrink Passport")}&body=${encodeURIComponent(
    [
      "DrShrink Passport",
      "",
      `Code: ${$passportCode}`,
      `Passkey: ${$passportPhrase}`,
      `One-tap unlock: ${unlockUrl()}`,
      "",
      "Permanent. Works on any device that opens the link or types the four words.",
    ].join("\n"),
  )}`;
</script>

<svelte:head>
  <title>DrShrink Passport</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="wrap">
  <section class="ds-modal-box panel">
    <div class="ds-pitch">
      <div class="ds-pitch-mascot" aria-hidden="true">
        <ThemeMascot theme={$theme} size="100%" />
      </div>

      {#if state === "waiting"}
        <div class="ds-pitch-head">
          <h1 class="ds-headline">Stamping the <span class="ds-marker">Passport.</span></h1>
          <p class="ds-accent-sub">Square is confirming the payment.</p>
        </div>
        <p class="ds-fine">This usually takes a few seconds. The page keeps checking on its own.</p>
      {:else if state === "ready"}
        <div class="ds-pitch-head">
          <h1 class="ds-headline">Passport <span class="ds-marker">ready.</span></h1>
          <p class="ds-accent-sub">Every dial is open. Nothing to renew.</p>
        </div>
        <div class="ds-card pass">
          <p class="ds-code">{$passportCode}</p>
          <p class="phrase">{$passportPhrase}</p>
          <p class="ds-fine">
            The four words open the Passport on any other device. Worth keeping
            somewhere — browsers forget.
          </p>
        </div>
        <div class="actions">
          <button class="ds-pitch-secondary" type="button" on:click={copy}>
            {copied || "Copy unlock link"}
          </button>
          <a class="ds-pitch-secondary" href={mailto}>Email this passkey</a>
          <a class="ds-pitch-cta" href="/">Back to DrShrink</a>
        </div>
      {:else if state === "stalled"}
        <div class="ds-pitch-head">
          <h1 class="ds-headline">Still <span class="ds-marker">stamping.</span></h1>
          <p class="ds-accent-sub">The payment is taking longer than usual to confirm.</p>
        </div>
        <p class="ds-fine">
          Money taken means a Passport exists — this page can keep checking, and
          the receipt email from Square is proof if anything needs sorting.
        </p>
        <div class="actions">
          <button class="ds-pitch-cta" type="button" on:click={retry}>Keep checking</button>
          <a class="ds-pitch-secondary" href="/">Back to DrShrink</a>
        </div>
      {:else}
        <div class="ds-pitch-head">
          <h1 class="ds-headline">That link <span class="ds-marker">lapsed.</span></h1>
          <p class="ds-accent-sub">{message}</p>
        </div>
        <p class="ds-fine">
          A paid Passport still exists on Square's side. Opening DrShrink and
          starting checkout again in the same browser is the quickest route; the
          Ko-fi inbox works for anything stranger.
        </p>
        <a class="ds-pitch-cta" href="/">Back to DrShrink</a>
      {/if}
    </div>
  </section>
</main>

<style>
  .wrap {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 1.5rem 1rem;
    background: var(--ds-bg, #fff6e6);
  }
  .panel {
    animation: none;
  }
  .pass {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pass .ds-code {
    font-size: 1.2rem;
  }
  .phrase {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--ds-primary-color, #9333ea);
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
