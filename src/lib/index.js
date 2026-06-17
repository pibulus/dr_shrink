// DrShrink shared lib — theme store + applyTheme
import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { THEMES, DEFAULT_THEME, STORAGE_KEYS } from "./constants.js";

const valid = new Set(Object.values(THEMES));

function readInitial() {
  if (!browser) return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  return stored && valid.has(stored) ? stored : DEFAULT_THEME;
}

export const theme = writable(readInitial());

/** Set + persist the theme and reflect it on <html data-theme>. */
export function applyTheme(id) {
  const safe = valid.has(id) ? id : DEFAULT_THEME;
  theme.set(safe);
  if (browser) {
    localStorage.setItem(STORAGE_KEYS.THEME, safe);
    document.documentElement.setAttribute("data-theme", safe);
  }
}

export { THEMES, DEFAULT_THEME, STORAGE_KEYS };
