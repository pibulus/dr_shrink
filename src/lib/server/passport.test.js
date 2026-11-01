import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$env/dynamic/private", () => ({
  env: {
    PASSPORT_LICENSE_SECRET: "test-secret-that-is-long-enough",
    DRSHRINK_STORE: "memory",
    SUPPORTER_VOUCHER_LIMIT: "2",
  },
}));
vi.mock("$env/dynamic/public", () => ({ env: {} }));

let crypto, licenses, store;
beforeEach(async () => {
  vi.resetModules();
  crypto = await import("./licenseCrypto.js");
  licenses = await import("./licenses.js");
  store = await import("./store.js");
  store._resetMemory();
});

describe("licenseCrypto", () => {
  it("mints a stable DS code and accepts every spelling of it", () => {
    const code = crypto.generateLicenseCode("checkout-1");
    expect(code).toMatch(/^DS-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(crypto.generateLicenseCode("checkout-1")).toBe(code);
    const bare = code.replace(/^DS-/, "").replace(/-/g, "");
    expect(crypto.normalizeCode(bare.toLowerCase())).toBe(code);
    expect(crypto.normalizeCode(` ds ${bare} `)).toBe(code);
    expect(crypto.normalizeCode("nonsense")).toBe("");
  });

  it("derives four words from a code, deterministically", () => {
    const code = crypto.generateLicenseCode("checkout-2");
    const phrase = crypto.phraseForCode(code);
    expect(phrase.split(" ")).toHaveLength(4);
    expect(crypto.phraseForCode(code.toLowerCase())).toBe(phrase);
    expect(crypto.normalizePhrase(`  ${phrase.toUpperCase()}!! `)).toBe(phrase);
    expect(crypto.normalizePhrase("only three words")).toBe("");
  });

  it("issues a permanent token that verifies and tamper-fails", () => {
    const token = crypto.issueToken({ id: "lic-1" });
    const body = crypto.verifyToken(token);
    expect(body.sub).toBe("lic-1");
    expect(body.tier).toBe("passport");
    expect(body.exp).toBeUndefined();
    expect(crypto.verifyToken(token.slice(0, -2) + "xx")).toBeNull();
  });
});

describe("licenses on the memory store", () => {
  it("creates a license idempotently and finds it by code or phrase", async () => {
    const checkout = { id: "c-1", status: "paid" };
    const a = await licenses.createLicenseForCheckout(checkout);
    const b = await licenses.createLicenseForCheckout(checkout);
    expect(a.license.id).toBe(b.license.id);
    expect(a.code).toBe(b.code);

    const byCode = await licenses.findLicense(a.code);
    expect(byCode.license.id).toBe(a.license.id);
    const byPhrase = await licenses.findLicense(a.phrase.toUpperCase());
    expect(byPhrase.code).toBe(a.code);
    expect(
      await licenses.findLicense("mossy otter drifts midnight"),
    ).toBeNull();
  });

  it("marks a checkout paid once via its order id", async () => {
    await licenses.saveCheckout({
      id: "c-2",
      status: "pending",
      providerOrderId: "order-9",
      claimExpiresAt: new Date(Date.now() + 1000).toISOString(),
    });
    const paid = await licenses.markPaid("order-9", { id: "pay-1" });
    expect(paid.status).toBe("paid");
    expect(await licenses.markPaid("order-9", { id: "pay-1" })).toEqual(paid);
    expect(await licenses.markPaid("nope", {})).toBeNull();
    expect(licenses.isClaimExpired(paid)).toBe(false);
  });

  it("voucher minting stops at the cap", async () => {
    const one = await licenses.createVoucherLicense();
    const two = await licenses.createVoucherLicense();
    expect(one.code).not.toBe(two.code);
    expect(one.license.source).toBe("voucher");
    await expect(licenses.createVoucherLicense()).rejects.toMatchObject({
      code: "VOUCHER_LIMIT",
    });
  });

  it("serialises concurrent updates on one key", async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        store.update("counter", (v) => ({ n: (v?.n || 0) + 1 })),
      ),
    );
    expect((await store.get("counter")).n).toBe(20);
  });
});
