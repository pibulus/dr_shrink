<script>
  // Title/description/OG live in app.html (single source of truth) — the layout
  // intentionally does NOT emit a <title> to avoid duplicate head tags.
  export let footerYear = new Date().getFullYear();
</script>

<a class="skip-link" href="#main-content">Skip to content</a>

<div
  class="bg-gradient-mesh page-shell grid min-h-[100dvh] gap-8 px-4 py-6 pt-[clamp(4rem,12vh,8rem)] font-sans text-gray-800 antialiased sm:px-6 md:px-10"
>
  <main
    id="main-content"
    class="mx-auto flex w-full max-w-md flex-col items-center sm:max-w-lg md:max-w-2xl lg:max-w-3xl"
  >
    <slot />
  </main>

  <footer
    class="ds-app-footer fixed bottom-0 left-0 right-0 z-10 box-border border-t pb-2 pt-3 text-center text-xs text-gray-600 backdrop-blur-[3px] sm:pb-4 sm:pt-5"
  >
    <div
      class="container mx-auto flex flex-row items-center justify-center gap-1 sm:justify-between sm:gap-3"
    >
      <div class="ml-4 hidden flex-wrap items-center sm:ml-6 sm:flex">
        <span class="mr-1 text-sm font-medium text-gray-500">
          © {footerYear} DrShrink
        </span>
        <span class="footer-dot mx-2">•</span>
        <span class="text-sm font-light text-gray-600">Melbourne</span>
      </div>
      <div class="flex items-center sm:mr-6">
        <slot name="footer-buttons" />
      </div>
    </div>
  </footer>
</div>

<style>
  .page-shell {
    /* reserve room for the fixed footer (matches ZipList's tuned values) */
    padding-bottom: calc(5rem + env(safe-area-inset-bottom));
  }

  .bg-gradient-mesh {
    /* SoftStack signature: warm centered radial mesh (matches talktype/ziplist) */
    background-color: var(--ds-bg, #fff6e6);
    background-image: radial-gradient(
      circle at center,
      var(--ds-bg, #fff6e6) 0%,
      var(--ds-bg, #fff6e6) 40%,
      var(--ds-bg-2, #fff0d4) 70%,
      var(--ds-bg-3, #ffe8c8) 100%
    );
  }

  .ds-app-footer {
    background: rgba(var(--ds-footer-surface-rgb, 255, 255, 255), 0.75);
    border-color: rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.14);
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }

  .footer-dot {
    color: var(--ds-accent-color, #c026d3);
  }

  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    z-index: 50;
    padding: 0.5rem 1rem;
    background: #fff;
    border-radius: 0 0 0.5rem 0;
  }
  .skip-link:focus {
    left: 0;
  }
</style>
