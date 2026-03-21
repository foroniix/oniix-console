import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, requireTenant } from "./auth";
import { cookies } from "next/headers";
import { supabaseUser } from "./supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("./supabase", () => ({ supabaseUser: vi.fn() }));

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function mockCookieStore(token?: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
  } as unknown as CookieStore);
}

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    mockCookieStore();

    const res = await requireAuth();
    expect("res" in res).toBe(true);
    if ("res" in res) {
      expect(res.res.status).toBe(401);
    }
    expect(supabaseUser).not.toHaveBeenCalled();
  });

  it("returns 401 when session is invalid", async () => {
    mockCookieStore("bad-token");
    vi.mocked(supabaseUser).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("invalid") }),
      },
    } as unknown as ReturnType<typeof supabaseUser>);

    const res = await requireAuth();
    expect("res" in res).toBe(true);
    if ("res" in res) {
      expect(res.res.status).toBe(401);
    }
  });

  it("accepts a bearer token from the request headers", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-header",
          app_metadata: { tenant_id: "tenant-header", role: "member" },
        },
      },
      error: null,
    });
    vi.mocked(supabaseUser).mockReturnValue({
      auth: {
        getUser,
      },
    } as unknown as ReturnType<typeof supabaseUser>);

    const request = new Request("https://oniix.space/api/notifications", {
      headers: {
        authorization: "Bearer header-token-value-1234567890",
      },
    });

    const res = await requireAuth(request);
    expect("ctx" in res).toBe(true);
    if ("ctx" in res) {
      expect(res.ctx.userId).toBe("user-header");
      expect(res.ctx.tenantId).toBe("tenant-header");
      expect(res.ctx.role).toBe("member");
    }
    expect(supabaseUser).toHaveBeenCalledWith("header-token-value-1234567890");
  });

  it("returns 403 when tenant membership is missing", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabaseUser).mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    } as unknown as ReturnType<typeof supabaseUser>);

    const res = await requireTenant({
      accessToken: "token-a",
      userId: "user-a",
      tenantId: "tenant-a",
      role: null,
      user: {} as never,
    });

    expect(res?.status).toBe(403);
  });

  it("returns null when tenant membership exists", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "member" }, error: null }),
    };
    vi.mocked(supabaseUser).mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    } as unknown as ReturnType<typeof supabaseUser>);

    const res = await requireTenant({
      accessToken: "token-b",
      userId: "user-b",
      tenantId: "tenant-b",
      role: null,
      user: {} as never,
    });

    expect(res).toBeNull();
  });
});
