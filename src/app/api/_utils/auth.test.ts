import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, requireTenant } from "./auth";
import { cookies } from "next/headers";
import { supabaseUser } from "./supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("./supabase", () => ({ supabaseUser: vi.fn() }));

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    (cookies as any).mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

    const res = await requireAuth();
    expect("res" in res).toBe(true);
    if ("res" in res) {
      expect(res.res.status).toBe(401);
    }
    expect(supabaseUser).not.toHaveBeenCalled();
  });

  it("returns 401 when session is invalid", async () => {
    (cookies as any).mockReturnValue({ get: vi.fn().mockReturnValue({ value: "bad-token" }) });
    (supabaseUser as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("invalid") }),
      },
    });

    const res = await requireAuth();
    expect("res" in res).toBe(true);
    if ("res" in res) {
      expect(res.res.status).toBe(401);
    }
  });

  it("returns 403 when tenant membership is missing", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabaseUser as any).mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    const res = await requireTenant({
      accessToken: "token-a",
      userId: "user-a",
      tenantId: "tenant-a",
      role: null,
      user: {} as any,
    });

    expect(res?.status).toBe(403);
  });

  it("returns null when tenant membership exists", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "member" }, error: null }),
    };
    (supabaseUser as any).mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    const res = await requireTenant({
      accessToken: "token-b",
      userId: "user-b",
      tenantId: "tenant-b",
      role: null,
      user: {} as any,
    });

    expect(res).toBeNull();
  });
});
