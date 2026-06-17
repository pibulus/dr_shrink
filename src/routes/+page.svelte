<script>
  import { Mascot, getAccessoryNames } from "$lib/components/mascot";

  let mascot;
  let accessory = "none";
  const hats = getAccessoryNames();

  function handleActivate() {
    // Placeholder: pulse the mascot. Real compression flow lands next phase.
    mascot?.pulse();
  }
</script>

<svelte:head>
  <title>DrShrink — drop a file, get a smaller one</title>
</svelte:head>

<main
  class="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center"
>
  <div class="mascot-slot">
    <Mascot
      bind:this={mascot}
      theme="purple"
      {accessory}
      ariaLabel="DrShrink — compress a file"
      on:activate={handleActivate}
    />
  </div>

  <h1 class="text-5xl font-black tracking-tight text-primary sm:text-6xl">
    DrShrink
  </h1>
  <p class="max-w-prose text-lg text-gray-600">
    Drop a file in, get a smaller one out. No settings, no fuss.
  </p>

  <!-- Dev: hat picker (à la Malibu Stacey's new hat) -->
  <div class="flex flex-wrap justify-center gap-2">
    {#each hats as h}
      <button
        class="rounded-full border-2 border-black/20 px-3 py-1 text-sm font-bold capitalize transition"
        class:bg-primary={accessory === h}
        class:text-white={accessory === h}
        on:click={() => (accessory = h)}
      >
        {h.replace("-", " ")}
      </button>
    {/each}
  </div>
</main>

<style>
  .mascot-slot {
    width: 160px;
    height: 160px;
  }

  @media (min-width: 768px) {
    .mascot-slot {
      width: 200px;
      height: 200px;
    }
  }
</style>
