// Tiny JSON-file KV for the single-node box deploy, with an in-memory twin
// for tests (and for hosts without a writable disk, where checkout simply
// reports "needs server setup"). One file per key, atomic rename on write,
// and a per-key promise chain so concurrent updates (webhook + success poll)
// serialise instead of clobbering each other.
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataDir, storeKind } from "./env.js";

const memory = new Map();
const chains = new Map();

function safeName(key) {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_") + ".json";
}

async function fileGet(key) {
  try {
    const raw = await fs.readFile(path.join(dataDir(), safeName(key)), "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
}

async function fileSet(key, value) {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, safeName(key));
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value), "utf8");
  await fs.rename(tmp, target);
}

async function fileDelete(key) {
  await fs.unlink(path.join(dataDir(), safeName(key))).catch(() => {});
}

export async function get(key) {
  if (storeKind() === "memory") return memory.has(key) ? memory.get(key) : null;
  return fileGet(key);
}

export async function set(key, value) {
  if (storeKind() === "memory") {
    memory.set(key, value);
    return;
  }
  await fileSet(key, value);
}

export async function del(key) {
  if (storeKind() === "memory") {
    memory.delete(key);
    return;
  }
  await fileDelete(key);
}

/** Read-modify-write under a per-key lock. `fn` gets the current value
 *  (or null) and returns the next one; returning undefined leaves it alone. */
export async function update(key, fn) {
  const prev = chains.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((r) => (release = r));
  chains.set(
    key,
    prev.then(() => gate),
  );
  try {
    await prev;
    const current = await get(key);
    const next = await fn(current);
    if (next !== undefined) await set(key, next);
    return next === undefined ? current : next;
  } finally {
    release();
    if (chains.get(key) === gate) chains.delete(key);
  }
}

/** Can this host persist anything? Filesystem probe, memory always yes. */
export async function isWritable() {
  if (storeKind() === "memory") return true;
  try {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.access(dataDir(), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Test helper. */
export function _resetMemory() {
  memory.clear();
}
