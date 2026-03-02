import { beforeEach, describe, expect, it, vi } from "vitest";

const baseEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) delete process.env[key];
  }
  Object.assign(process.env, baseEnv);
  delete process.env.ANALYTICS_INGEST_KEY;
  delete process.env.ANALYTICS_INGEST_KEYS;
});

async function loadMod() {
  return import("./analytics-ingest");
}

describe("analytics ingest auth", () => {
  it("verifies tenant key from JSON map", async () => {
    process.env.ANALYTICS_INGEST_KEYS = '{"tenant-a":"key-a"}';
    const mod = await loadMod();
    expect(mod.verifyIngestKey("tenant-a", "key-a")).toBe(true);
    expect(mod.verifyIngestKey("tenant-a", "bad")).toBe(false);
  });

  it("verifies tenant key from flat map", async () => {
    process.env.ANALYTICS_INGEST_KEYS = "tenant-a:key-a,tenant-b:key-b";
    const mod = await loadMod();
    expect(mod.verifyIngestKey("tenant-a", "key-a")).toBe(true);
    expect(mod.verifyIngestKey("tenant-b", "key-b")).toBe(true);
  });

  it("falls back to global key when tenant key is absent", async () => {
    process.env.ANALYTICS_INGEST_KEY = "global-key";
    const mod = await loadMod();
    expect(mod.verifyIngestKey("tenant-z", "global-key")).toBe(true);
    expect(mod.resolveExpectedIngestKey("tenant-z")).toBe("global-key");
  });

  it("verifies hashed tenant keys", async () => {
    const mod = await loadMod();
    const key = mod.generateIngestKey();
    const hash = mod.hashIngestKey(key);
    expect(mod.verifyHashedIngestKey(hash, key)).toBe(true);
    expect(mod.verifyHashedIngestKey(hash, "bad-key")).toBe(false);
  });
});
