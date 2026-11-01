<script>
  // First-visit welcome. A pitch sibling of About and Passport: same
  // skeleton (mascot → headline → sub → lines → one button), doctor's voice.
  import Modal from "./Modal.svelte";
  import { Mascot } from "$lib/components/mascot";
  import { theme } from "$lib";

  export let open = false;

  let modal;
</script>

<Modal {open} pitch labelledBy="intro-title" bind:this={modal} on:close>
  <div class="ds-pitch">
    <div class="ds-pitch-mascot floaty" aria-hidden="true">
      <Mascot
        character="brain"
        theme={$theme}
        interactive={false}
        ariaLabel="DrShrink brain mascot"
      />
    </div>

    <div class="ds-pitch-head">
      <h1 id="intro-title" class="ds-headline">
        Drop a file, get a <span class="ds-marker">smaller</span> one.
      </h1>
      <p class="ds-accent-sub">No settings, no sign-up, no upload.</p>
    </div>

    <div class="ds-pitch-lines">
      <p>Photos come back crisp and way lighter.</p>
      <p>A pile of files becomes one tidy zip.</p>
      <p>Audio and video slim down to lean little files.</p>
    </div>

    <button class="ds-pitch-cta" type="button" on:click={() => modal.close()}>
      Drop it. Shrink it. Done.
    </button>

    <p class="ds-fine">
      Files never leave this browser. Recent results stay cached here for 30
      minutes; Clear Recent removes them.
    </p>
  </div>
</Modal>

<style>
  .floaty {
    animation: floaty 3s ease-in-out infinite;
  }
  @keyframes floaty {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .floaty {
      animation: none;
    }
  }
</style>
