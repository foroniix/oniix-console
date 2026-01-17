import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getTenantContext, jsonError, requireTenantAdmin } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function withExpired(inv: any) {
  const exp = inv.expires_at ? new Date(inv.expires_at).getTime() : null;
  const expired = !!(exp && exp < Date.now());
  if (expired && inv.status === "pending") return { ...inv, status: "expired" };
  return inv;
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Accès refusé." ? 403 : 400);

  const { data, error } = await ctx.sb
    .from("tenant_invites")
    .select("id,email,role,code,status,created_at,expires_at")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 400);

  const invites = (data ?? []).map(withExpired);
  return NextResponse.json({ ok: true, invites }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Accès refusé." ? 403 : 400);

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role : "member";

  if (!email || !email.includes("@")) return jsonError("Email invalide", 400);
  if (!["member", "admin"].includes(role)) return jsonError("Role invalide", 400);

  // Évite les doublons: si une invite "pending" active existe déjà, on la réutilise.
  const { data: existing } = await ctx.sb
    .from("tenant_invites")
    .select("id,email,role,code,status,created_at,expires_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing?.[0]) {
    const inv = withExpired(existing[0]);
    if (inv.status === "pending") {
      return NextResponse.json(
        {
          ok: true,
          invite: inv,
          invite_url: `/accept-invite?code=${inv.code}`,
          reused: true,
        },
        { status: 200 }
      );
    }
  }

  const code = randomUUID().replaceAll("-", "");

  const { data, error } = await ctx.sb
    .from("tenant_invites")
    .insert({
      tenant_id: ctx.tenant_id,
      email,
      role,
      code,
      created_by: ctx.user.id,
      status: "pending",
    })
    .select("id,email,role,code,status,created_at,expires_at")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json(
    {
      ok: true,
      invite: withExpired(data),
      invite_url: `/accept-invite?code=${data.code}`,
    },
    { status: 200 }
  );
}
