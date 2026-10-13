// Preferences are optional: blocked or full storage must never stop a shrink.
export function readStorage(key) {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the current session usable when persistence is unavailable.
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Preferences are optional.
  }
}
