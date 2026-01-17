import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "./auth";
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
});
