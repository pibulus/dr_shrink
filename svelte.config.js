import adapterNode from "@sveltejs/adapter-node";
import adapterNetlify from "@sveltejs/adapter-netlify";

// Same switch the rest of the fleet uses: the Pi/EliteDesk deploy stays on
// adapter-node, and a Netlify build sets DEPLOY_TARGET=netlify. Added
// 2026-07-31 so this app could come back online while the EliteDesk migration
// is still pending — drshrink.app had been returning Cloudflare 530s (origin
// unreachable), which is also why its share card looked broken: the OG tags
// and image were correct all along, nothing was there to serve them.
//
// Nothing here needs a server: zero +server routes, zero secrets. It runs
// entirely in the browser, so either host is only ever shipping static files.
const adapter =
  process.env.DEPLOY_TARGET === "netlify"
    ? adapterNetlify()
    : adapterNode({ out: "build" });

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter,
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
