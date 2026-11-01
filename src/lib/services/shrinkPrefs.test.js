import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

const store = new Map();
vi.stubGlobal("localStorage", {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
});

let mod;
beforeEach(async () => {
  store.clear();
  vi.resetModules();
  mod = await import("./shrinkPrefs.js");
});

describe("shrinkPrefs", () => {
  it("starts on the defaults", () => {
    expect(get(mod.shrinkPrefs)).toEqual(mod.DEFAULT_PREFS);
    expect(mod.isCustom(get(mod.shrinkPrefs))).toBe(false);
  });

  it("persists a valid change and rejects junk", () => {
    mod.setPref("quality", "crisp");
    mod.setPref("format", "bmp"); // not a choice → ignored
    mod.setPref("fitUnder", 10);
    const p = get(mod.shrinkPrefs);
    expect(p.quality).toBe("crisp");
    expect(p.format).toBe("webp");
    expect(p.fitUnder).toBe(10);
    expect(JSON.parse(store.get("drshrink-shrink-prefs")).quality).toBe(
      "crisp",
    );
    expect(mod.isCustom(p)).toBe(true);
  });

  it("reloads from storage and sanitizes unknown keys", async () => {
    store.set(
      "drshrink-shrink-prefs",
      JSON.stringify({ format: "png", maxDim: 999, audioOnly: true, x: 1 }),
    );
    vi.resetModules();
    const fresh = await import("./shrinkPrefs.js");
    const p = get(fresh.shrinkPrefs);
    expect(p.format).toBe("png");
    expect(p.maxDim).toBe(3840);
    expect(p.audioOnly).toBe(true);
    expect("x" in p).toBe(false);
  });

  it("free tier always gets the defaults", () => {
    mod.setPref("quality", "lean");
    mod.setPref("looseBatch", true);
    const stored = get(mod.shrinkPrefs);
    expect(mod.effectivePrefs(stored, false)).toEqual(mod.DEFAULT_PREFS);
    expect(mod.effectivePrefs(stored, true).quality).toBe("lean");
    expect(mod.effectivePrefs(stored, true).looseBatch).toBe(true);
  });

  it("reset clears storage", () => {
    mod.setPref("quality", "lean");
    mod.resetPrefs();
    expect(store.has("drshrink-shrink-prefs")).toBe(false);
    expect(get(mod.shrinkPrefs)).toEqual(mod.DEFAULT_PREFS);
  });
});
