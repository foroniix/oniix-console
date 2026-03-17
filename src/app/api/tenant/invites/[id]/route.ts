import { NextResponse, type NextRequest } from "next/server";
import { canAssignTenantRole, normalizeTenantRole } from "@/lib/tenant-roles";
import { getTenantContext, jsonError, requireTenantCapability } from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InviteLookupRow = {
  id: string;
  tenant_id: string;
  status: string;
  role: string | null;
};

// Revoquer une invitation (UI: bouton supprimer)
// Appelle: DELETE /api/tenant/invites/:id
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const check = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user.id, "manage_invites");
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const resolved = await params;
  const id = resolved.id;
  if (!id) return jsonError("Identifiant manquant.", 400);

  const { data: inv, error: invErr } = await ctx.sb
    .from("tenant_invites")
    .select("id,tenant_id,status,role")
    .eq("id", id)
    .maybeSingle<InviteLookupRow>();

  if (invErr) {
    console.error("Tenant invite load error", { error: invErr.message, tenantId: ctx.tenant_id, id });
    return jsonError("Une erreur est survenue.", 400);
  }
  if (!inv) return jsonError("Invitation introuvable.", 404);
  if (inv.tenant_id !== ctx.tenant_id) return jsonError("Acces refuse.", 403);
  if (!canAssignTenantRole(check.role, normalizeTenantRole(inv.role))) {
    return jsonError("Acces refuse.", 403);
  }

  if (inv.status === "accepted") {
    return jsonError("Cette invitation a deja ete acceptee.", 400);
  }

  const { error } = await ctx.sb.from("tenant_invites").update({ status: "revoked" }).eq("id", id);
  if (error) {
    console.error("Tenant invite revoke error", { error: error.message, tenantId: ctx.tenant_id, id });
    return jsonError("Une erreur est survenue.", 400);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
