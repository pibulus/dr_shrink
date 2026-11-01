// In-memory sliding window per client + bucket. One node, one process —
// a Map is the right size. Trusts the rightmost X-Forwarded-For (written by
// the reverse proxy), never the leftmost (client-supplied).
import { json } from "@sveltejs/kit";
import { rateLimitConfig } from "./env.js";

const hits = new Map();

function clientKey(event) {
  const xff = event.request.headers.get("x-forwarded-for") || "";
  const last = xff.split(",").pop()?.trim();
  if (last) return last;
  try {
    return event.getClientAddress();
  } catch {
    return "unknown";
  }
}

export function enforceRateLimit(event, opts = {}) {
  const base = rateLimitConfig();
  const max = opts.max ?? base.max;
  const windowMs = opts.windowMs ?? base.windowMs;
  if (!max || !windowMs) return null;
  const now = Date.now();
  const key = `${opts.bucket || "global"}:${clientKey(event)}`;
  let e = hits.get(key);
  if (!e || now - e.start > windowMs) e = { start: now, count: 0 };
  e.count += 1;
  hits.set(key, e);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  }
  if (e.count > max) {
    const retry = Math.max(0, windowMs - (now - e.start));
    return json(
      { error: "A short pause, then it opens again.", retry_after_ms: retry },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retry / 1000)) },
      },
    );
  }
  return null;
}
