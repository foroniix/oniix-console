import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn() },
}));

const baseEnv = { ...process.env };

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) delete process.env[key];
  }
  Object.assign(process.env, baseEnv);
});

async function loadRateLimit() {
  vi.resetModules();
  const { Redis } = await import("@upstash/redis");
  (Redis.fromEnv as any).mockReset();
  const mod = await import("./rate-limit");
  return { Redis, ...mod };
}

describe("rate-limit", () => {
  it("returns null when redis is unavailable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { Redis, enforceRateLimit } = await loadRateLimit();
    (Redis.fromEnv as any).mockImplementation(() => {
      throw new Error("missing env");
    });

    const res = await enforceRateLimit(new Request("https://example.com/api/auth/login"), {
      namespace: "AUTH",
      limit: 1,
      windowMs: 1000,
    });

    expect(res).toBeNull();
    errorSpy.mockRestore();
  });

  it("returns 429 when limit is exceeded", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { Redis, enforceRateLimit } = await loadRateLimit();
    const redis = {
      incr: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(5000),
    };
    (Redis.fromEnv as any).mockReturnValue(redis);

    const req = new Request("https://example.com/api/auth/login", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const config = { namespace: "AUTH", limit: 1, windowMs: 1000 };

    const first = await enforceRateLimit(req, config, "user-a");
    expect(first).toBeNull();

    const second = await enforceRateLimit(req, config, "user-a");
    expect(second?.status).toBe(429);
    expect(second?.headers.get("Retry-After")).toBeTruthy();
    warnSpy.mockRestore();
  });

  it("uses env overrides for config", async () => {
    process.env.RATE_LIMIT_AUTH_LIMIT = "7";
    process.env.RATE_LIMIT_AUTH_WINDOW_MS = "1500";

    const { getRateLimitConfig } = await loadRateLimit();
    const config = getRateLimitConfig("AUTH", { limit: 1, windowMs: 100 });
    expect(config.limit).toBe(7);
    expect(config.windowMs).toBe(1500);
  });
});
