import { beforeEach, describe, expect, it, vi } from "vitest";

const baseEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) delete process.env[key];
  }
  Object.assign(process.env, baseEnv);
  delete process.env.ANALYTICS_INGEST_TOKEN_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  delete process.env.ANALYTICS_INGEST_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE;
});

async function loadMod() {
  return import("./ingest-token");
}

describe("ingest token", () => {
  it("creates and verifies a token scoped to tenant/stream", async () => {
    process.env.ANALYTICS_INGEST_TOKEN_SECRET = "test-secret";
    const mod = await loadMod();

    const tokenRes = mod.createIngestToken({
      tenantId: "tenant-a",
      streamId: "stream-1",
      ttlSec: 120,
    });
    expect(tokenRes.ok).toBe(true);
    if (!tokenRes.ok) return;

    const verifyRes = mod.verifyIngestToken(tokenRes.token);
    expect(verifyRes.ok).toBe(true);
    if (!verifyRes.ok) return;

    expect(verifyRes.payload.tenant_id).toBe("tenant-a");
    expect(verifyRes.payload.stream_id).toBe("stream-1");
  }, 10_000);

  it("clamps ttl boundaries", async () => {
    process.env.ANALYTICS_INGEST_TOKEN_SECRET = "test-secret";
    const mod = await loadMod();

    const low = mod.createIngestToken({ tenantId: "tenant-a", ttlSec: 1 });
    const high = mod.createIngestToken({ tenantId: "tenant-a", ttlSec: 9999 });

    expect(low.ok && low.ttlSec).toBe(30);
    expect(high.ok && high.ttlSec).toBe(900);
  });

  it("falls back to service role secret when dedicated secret is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    const mod = await loadMod();

    const tokenRes = mod.createIngestToken({ tenantId: "tenant-a", ttlSec: 60 });
    expect(tokenRes.ok).toBe(true);
    if (!tokenRes.ok) return;

    const verifyRes = mod.verifyIngestToken(tokenRes.token);
    expect(verifyRes.ok).toBe(true);
  });

  it("rejects expired tokens", async () => {
    process.env.ANALYTICS_INGEST_TOKEN_SECRET = "test-secret";
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_700_000_000_000);
    const mod = await loadMod();

    const tokenRes = mod.createIngestToken({ tenantId: "tenant-a", ttlSec: 30 });
    expect(tokenRes.ok).toBe(true);
    if (!tokenRes.ok) return;

    nowSpy.mockReturnValue(1_700_000_040_000);
    const verifyRes = mod.verifyIngestToken(tokenRes.token);
    expect(verifyRes.ok).toBe(false);
  });
});
