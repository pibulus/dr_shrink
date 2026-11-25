<script>
  // Title/description/OG live in app.html (single source of truth) — the layout
  // intentionally does NOT emit a <title> to avoid duplicate head tags.
  export let footerYear = new Date().getFullYear();
  export let appName = "DrShrink";
</script>

<a class="skip-link" href="#main-content">Skip to content</a>

<div
  class="bg-gradient-mesh page-shell flex min-h-[100dvh] flex-col pt-[clamp(4rem,12vh,8rem)] font-sans text-[#1e1714] antialiased"
>
  <main
    id="main-content"
    class="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-8 sm:max-w-lg sm:px-6 md:max-w-2xl md:px-10 lg:max-w-3xl"
  >
    <slot />
  </main>

  <footer
    class="ds-app-footer mt-auto w-full box-border border-t-2 pb-2 pt-2.5 text-center text-xs sm:pb-3.5 sm:pt-3.5 px-4 sm:px-6 md:px-8"
  >
    <div
      class="footer-row mx-auto flex w-full flex-row items-center justify-center gap-3 sm:justify-between"
    >
      <div class="hidden items-center sm:flex min-w-0 shrink whitespace-nowrap">
        <span class="mr-1 text-sm font-semibold">
          © {footerYear}
          {appName}
        </span>
        <span class="footer-dot mx-2">•</span>
        <span class="text-sm font-normal">
          Made with
          <span
            class="footer-heart transition-transform hover:scale-110"
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
  @media (max-width: 640px) {
    .page-shell {
      padding-top: max(
        env(safe-area-inset-top),
        clamp(4rem, 10svh, 5.5rem)
      ) !important;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
  }
  /* Desktop top padding = TalkType's live value (measured 2026-11-01: mascot
     lands at y=80 @1280×800, y=90 @1440×900). */
  @media (min-width: 768px) {
    .page-shell {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-top: clamp(3rem, 10vh, 9rem) !important;
    }
  }
  @media (max-width: 640px) and (max-height: 740px) {
    .page-shell {
      padding-top: 1.5rem !important;
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
    color: var(--footer-text-color, #3f3630);
    background: var(
      --footer-bg,
      rgba(var(--ds-footer-surface-rgb, 255, 252, 245), 0.86)
    );
    border-color: var(--footer-border-color, #1e1714);
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
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
