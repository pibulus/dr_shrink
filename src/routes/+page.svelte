<script>
  import {
    Mascot,
    getAccessoryNames,
    getCharacterNames,
  } from "$lib/components/mascot";

  let mascot;
  let accessory = "none";
  let character = "brain";
  const hats = getAccessoryNames();
  const characters = getCharacterNames();

  function handleActivate() {
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
      {character}
      {accessory}
      theme="purple"
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

  <!-- Icon factory playground -->
  <div class="flex flex-col items-center gap-3">
    <div class="flex flex-wrap justify-center gap-2">
      <span class="self-center text-xs font-bold uppercase text-gray-400">Character</span>
      {#each characters as c}
        <button
          class="rounded-full border-2 border-black/20 px-3 py-1 text-sm font-bold capitalize"
          class:bg-accent={character === c}
          class:text-white={character === c}
          on:click={() => (character = c)}
        >
          {c}
        </button>
      {/each}
    </div>
    <div class="flex flex-wrap justify-center gap-2">
      <span class="self-center text-xs font-bold uppercase text-gray-400">Hat</span>
      {#each hats as h}
        <button
          class="rounded-full border-2 border-black/20 px-3 py-1 text-sm font-bold capitalize"
          class:bg-primary={accessory === h}
          class:text-white={accessory === h}
          on:click={() => (accessory = h)}
        >
          {h.replace("-", " ")}
        </button>
      {/each}
    </div>
  </div>
</main>

<style>
  .mascot-slot {
    width: 200px;
    height: 200px;
  }
</style>
