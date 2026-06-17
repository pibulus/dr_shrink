import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
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
    assetsInlineLimit: (file) => (/mascot\/art\/.*\.svg$/.test(file) ? false : undefined),
  },
});
