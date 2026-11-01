<script>
  // One-tap unlock link: /u/<code> → the front page redeems ?unlock=<code>.
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  onMount(() => {
    goto(`/?unlock=${encodeURIComponent($page.params.code)}`, {
      replaceState: true,
    });
  });
</script>

<p class="sr-only">Opening DrShrink.</p>
