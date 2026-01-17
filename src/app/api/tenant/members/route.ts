import { NextResponse } from "next/server";
import { getTenantContext, jsonError } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  // Membres du tenant (RLS applique)
  const { data: members, error } = await ctx.sb
    .from("tenant_memberships")
    .select("user_id, role, created_at")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Tenant members load error", { error: error.message, tenantId: ctx.tenant_id });
    return jsonError("Une erreur est survenue.", 400);
  }

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
