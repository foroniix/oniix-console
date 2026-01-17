import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext, jsonError, requireTenantAdmin } from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Révoquer une invitation (UI: bouton supprimer)
// Appelle: DELETE /api/tenant/invites/:id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Accès refusé." ? 403 : 400);

  const id = (params as any)?.id ?? Object.values(params ?? {})[0];
  if (!id) return jsonError("id manquant", 400);

  // Sécurité: l'invite doit appartenir au tenant
  const { data: inv, error: invErr } = await ctx.sb
    .from("tenant_invites")
    .select("id,tenant_id,status")
    .eq("id", id)
    .maybeSingle();

  if (invErr) return jsonError(invErr.message, 400);
  if (!inv) return jsonError("Invite inconnue", 404);
  if ((inv as any).tenant_id !== ctx.tenant_id) return jsonError("Accès refusé.", 403);

  if ((inv as any).status === "accepted") {
    return jsonError("Impossible : invite déjà acceptée", 400);
  }

  // UI-friendly: on révoque au lieu de supprimer physiquement
  const { error } = await ctx.sb.from("tenant_invites").update({ status: "revoked" }).eq("id", id);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true }, { status: 200 });
}
