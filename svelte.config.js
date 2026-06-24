import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      out: "build",
    }),
    // CSP managed by SvelteKit so it auto-hashes its inline bootstrap script.
    // A hand-rolled <meta> CSP blocks hydration — SvelteKit's inline start
    // script gets rejected by script-src, leaving a dead static page.
    // 'wasm-unsafe-eval' is required by ffmpeg.wasm; blob: covers ffmpeg's
    // blob-URL core + file previews. No external origins.
    csp: {
      mode: "hash",
      directives: {
        "default-src": ["self"],
        "script-src": ["self", "wasm-unsafe-eval"],
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:", "blob:"],
        "media-src": ["self", "blob:"],
        "connect-src": ["self", "blob:"],
        "worker-src": ["self", "blob:"],
        "font-src": ["self"],
        "frame-src": ["none"],
        "object-src": ["none"],
        "base-uri": ["none"],
      },
    },
  },
};

export default config;
