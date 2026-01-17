import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getTenantContext, jsonError, requireTenantAdmin } from "../../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Renvoyer une invitation:
// - regen code
// - remet status = pending
// - (optionnel) peut étendre expires_at si ta DB n'a pas de trigger
// Appelle: POST /api/tenant/invites/:id/resend
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Accès refusé." ? 403 : 400);

  const id = (params as any)?.id ?? Object.values(params ?? {})[0];
  if (!id) return jsonError("id manquant", 400);

  const { data: inv, error: invErr } = await ctx.sb
    .from("tenant_invites")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (invErr) return jsonError(invErr.message, 400);
  if (!inv) return jsonError("Invite inconnue", 404);
  if ((inv as any).tenant_id !== ctx.tenant_id) return jsonError("Accès refusé.", 403);
  if ((inv as any).status === "accepted") return jsonError("Invite déjà acceptée", 400);

  const code = randomUUID().replaceAll("-", "");

  const { data, error } = await ctx.sb
    .from("tenant_invites")
    .update({ code, status: "pending" })
    .eq("id", id)
    .select("id,email,role,code,status,created_at,expires_at")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json(
    {
      ok: true,
      invite: data,
      invite_url: `/accept-invite?code=${data.code}`,
    },
    { status: 200 }
  );
}
