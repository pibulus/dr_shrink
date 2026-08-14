import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  // ffmpeg.wasm spawns its worker via `new URL("./worker.js", import.meta.url)`.
  // Vite's dep pre-bundling relocates the package, breaking that URL — the worker
  // 404s and FFmpeg.load() hangs forever (the silent "Shrinking…" freeze on audio).
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  server: {
    port: 3002, // Default DrShrink dev port
    host: true, // allows access from other devices on the network
    strictPort: true, // exits if port is already taken (no fallback)
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
  build: {
    // Never inline mascot art SVGs — <use href="data:..."> is blocked cross-origin.
    assetsInlineLimit: (file) =>
      /mascot\/art\/.*\.svg$/.test(file) ? false : undefined,
  },
});
