<script>
  // Title/description/OG live in app.html (single source of truth) — the layout
  // intentionally does NOT emit a <title> to avoid duplicate head tags.
  export let footerYear = new Date().getFullYear();
  export let appName = "DrShrink";
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
    class="ds-app-footer fixed bottom-0 left-0 right-0 z-10 box-border border-t pb-2 pt-3 text-center text-xs sm:pb-4 sm:pt-5 px-4 sm:px-6 md:px-8"
  >
    <div
      class="footer-row mx-auto flex w-full flex-row items-center justify-center gap-3 sm:justify-between"
    >
      <div class="hidden items-center sm:flex min-w-0 shrink whitespace-nowrap">
        <span class="mr-1 text-sm font-medium">
          © {footerYear}
          {appName}
        </span>
        <span class="footer-dot mx-2">•</span>
        <span class="text-sm font-light">
          <span
            class="footer-heart animate-pulse transition-transform hover:scale-110"
            aria-label="love">❤️</span
          > in Melbourne
        </span>
      </div>
      <div class="flex shrink-0 items-center">
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

  @media (max-width: 640px) {
    .page-shell {
      padding-top: max(env(safe-area-inset-top), clamp(4rem, 10svh, 5.5rem)) !important;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
  }
  @media (min-width: 1024px) {
    .page-shell {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-top: 15vh !important;
    }
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
    color: var(--footer-text-color, #4b5563);
    background: var(
      --footer-bg,
      rgba(var(--ds-footer-surface-rgb, 255, 255, 255), 0.82)
    );
    border-color: var(
      --footer-border-color,
      rgba(var(--ds-primary-color-rgb, 147, 51, 234), 0.14)
    );
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
    /* Fleet-standard frosted footer (2026-07-21) — same values across
       ziplist / talktype / daysay / riffrap / dr_shrink. Declared in CSS
       rather than a backdrop-blur-* utility so it can't be dropped by a
       later class shuffle. 3px was too weak to frost anything; 14px +
       saturation is what makes it read as glass instead of a thin veil. */
    -webkit-backdrop-filter: blur(14px) saturate(1.5);
    backdrop-filter: blur(14px) saturate(1.5);
  }

  /* No backdrop-filter support: go nearly opaque. The translucency only
     earns its keep when a blur is actually frosting what's behind it. */
  @supports not (backdrop-filter: blur(1px)) {
    .ds-app-footer {
      background: rgba(var(--ds-footer-surface-rgb, 255, 246, 230), 0.97);
    }
  }

  .footer-dot {
    color: var(--footer-dot-color, var(--ds-accent-color, #c026d3));
  }

  .footer-heart {
    color: var(--footer-heart-color, var(--ds-accent-color, #c026d3));
    display: inline-block;
  }

  @media (prefers-reduced-motion: reduce) {
    .footer-heart {
      animation: none;
    }
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
