import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { canAssignTenantRole, normalizeTenantRole } from "@/lib/tenant-roles";
import { getTenantContext, jsonError, requireTenantCapability } from "../../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InviteLookupRow = {
  id: string;
  tenant_id: string;
  status: string;
  role: string | null;
};

// Renvoyer une invitation:
// - regen code
// - remet status = pending
// - (optionnel) peut etendre expires_at si la DB n'a pas de trigger
// Appelle: POST /api/tenant/invites/:id/resend
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const check = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user.id, "manage_invites");
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const resolved = await params;
  const id = resolved.id;
  if (!id) return jsonError("Identifiant manquant.", 400);

  const { data: inv, error: invErr } = await ctx.sb
    .from("tenant_invites")
    .select("*")
    .eq("id", id)
    .maybeSingle<InviteLookupRow>();

  if (invErr) {
    console.error("Tenant invite lookup error", { error: invErr.message, tenantId: ctx.tenant_id, id });
    return jsonError("Une erreur est survenue.", 400);
  }
  if (!inv) return jsonError("Invitation introuvable.", 404);
  if (inv.tenant_id !== ctx.tenant_id) return jsonError("Acces refuse.", 403);
  if (!canAssignTenantRole(check.role, normalizeTenantRole(inv.role))) {
    return jsonError("Acces refuse.", 403);
  }
  if (inv.status === "accepted") return jsonError("Cette invitation a deja ete acceptee.", 400);

  const code = randomUUID().replaceAll("-", "");

  const { data, error } = await ctx.sb
    .from("tenant_invites")
    .update({ code, status: "pending" })
    .eq("id", id)
    .select("id,email,role,code,status,created_at,expires_at")
    .single();

  if (error) {
    console.error("Tenant invite resend error", { error: error.message, tenantId: ctx.tenant_id, id });
    return jsonError("Une erreur est survenue.", 400);
  }

  return NextResponse.json(
    {
      ok: true,
      invite: { ...data, role: normalizeTenantRole(data.role) },
      invite_url: `/console/accept-invite?code=${data.code}`,
    },
    { status: 200 }
  );
}
