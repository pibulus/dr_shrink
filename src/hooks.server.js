// ── SharedArrayBuffer + cross-origin isolation (ffmpeg.wasm 0.12) ──
export async function handle({ event, resolve }) {
  const response = await resolve(event);
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  return response;
}
