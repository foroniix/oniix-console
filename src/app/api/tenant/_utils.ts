import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser, supabaseAdmin } from "../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function getTenantContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) return { ok: false as const, res: jsonError("Not authenticated", 401) };

  const sb = supabaseUser(token);
  const { data, error } = await sb.auth.getUser();

  if (error || !data?.user) return { ok: false as const, res: jsonError("Invalid session", 401) };

  const user = data.user;
  const tenant_id =
    (user.app_metadata as any)?.tenant_id ??
    (user.user_metadata as any)?.tenant_id ??
    null;

  return {
    ok: true as const,
    sb,
    admin: supabaseAdmin(),
    user,
    tenant_id: tenant_id as string | null,
  };
}

export async function requireTenantAdmin(
  sb: ReturnType<typeof supabaseUser>,
  tenant_id: string,
  user_id: string
) {
  const { data, error } = await sb
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  const role = (data as any)?.role as string | undefined;

  if (!role || (role !== "owner" && role !== "admin")) {
    return { ok: false as const, error: "Forbidden" };
  }

  return { ok: true as const, role };
}
