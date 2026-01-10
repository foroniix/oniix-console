import { NextResponse } from "next/server";
import { getTenantContext, jsonError } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  // Membres du tenant (RLS appliqué)
  const { data: members, error } = await ctx.sb
    .from("tenant_memberships")
    .select("user_id, role, created_at")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 400);

  // Enrichir avec email via service role (server only)
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      try {
        const { data } = await ctx.admin.auth.admin.getUserById(m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          created_at: m.created_at,
          email: data.user?.email ?? null,
        };
      } catch {
        return { ...m, email: null };
      }
    })
  );

  return NextResponse.json({ ok: true, members: enriched }, { status: 200 });
}
