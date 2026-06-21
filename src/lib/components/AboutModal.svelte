<script>
  import Modal from "./Modal.svelte";
  import ThemeMascot from "./ThemeMascot.svelte";
  import { theme } from "$lib";

  export let open = false;
</script>

<Modal {open} title="The shrink-anything thing" on:close>
  <svelte:fragment slot="icon">
    <ThemeMascot theme={$theme} size="30px" />
  </svelte:fragment>
  <div class="space-y-3">
    <p class="lede">
      DrShrink takes the thing you drop and hands back something smaller and more
      useful. No settings, no sign-up, no upload — it all happens right here in
      your browser.
    </p>

    <h4>What it does:</h4>
    <ul class="list">
      <li><span>⬩</span> Photos → crisp, way smaller</li>
      <li><span>⬩</span> A pile of files → one tidy zip</li>
      <li><span>⬩</span> Audio → a lean little mp3</li>
      <li><span>⬩</span> Docs &amp; text → stripped and squeezed</li>
    </ul>

    <p class="quote">"Drop it. Shrink it. Done."</p>

    <p class="privacy">
      🔒 Your files never leave your device. Nothing is uploaded, logged, or kept.
    </p>

    <div class="links">
      <a href="https://ko-fi.com/madebypablo" target="_blank" rel="noopener noreferrer">☕ Coffee jar</a>
      <a href="https://github.com/pibulus/dr_shrink" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>

    <div class="foot">
      <span>Melbourne, Australia</span>
      <span>Pablo</span>
    </div>
  </div>
</Modal>

<style>
  .space-y-3 > * + * { margin-top: 0.75rem; }
  .lede {
    background: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.08);
    border: 1px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.18);
    padding: 0.85rem;
    border-radius: 12px;
  }
  h4 {
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--ds-ink, #1f2937);
  }
  .list { display: flex; flex-direction: column; gap: 0.35rem; }
  .list li { display: flex; gap: 0.5rem; }
  .list span { color: var(--ds-accent-color, #c026d3); }
  .quote {
    border-left: 3px solid rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.4);
    padding-left: 0.9rem;
    font-style: italic;
    color: #6b6671;
  }
  .privacy { font-size: 0.85rem; color: #6b6671; }
  .links { display: flex; gap: 1rem; font-size: 0.8rem; }
  .links a { color: var(--ds-accent-color, #c026d3); font-weight: 600; }
  .links a:hover { text-decoration: underline; }
  .foot {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #9b9199;
    padding-top: 0.3rem;
  }
</style>
