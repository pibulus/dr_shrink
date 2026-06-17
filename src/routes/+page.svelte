<script>
  import { Mascot } from "$lib/components/mascot";

  let mascot;

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
  <!-- Mascot (placeholder ghost art for now; brain silhouette lands in art phase) -->
  <div class="mascot-slot">
    <Mascot
      bind:this={mascot}
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
