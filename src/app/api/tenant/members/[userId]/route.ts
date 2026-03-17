import { NextResponse, type NextRequest } from "next/server";
import { canAssignTenantRole } from "@/lib/tenant-roles";
import {
  getTenantContext,
  getTenantMembership,
  jsonError,
  requireTenantCapability,
} from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const check = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user.id, "manage_members");
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const targetUserId = userId;
  if (!targetUserId) return jsonError("Identifiant manquant.", 400);

  if (targetUserId === ctx.user.id) {
    return jsonError("Impossible de vous retirer vous-meme pour le moment.", 400);
  }

  const targetMembership = await getTenantMembership(ctx.sb, ctx.tenant_id, targetUserId);
  if (!targetMembership.ok) {
    return jsonError(targetMembership.error, targetMembership.error === "Acces refuse." ? 404 : 400);
  }

  if (!canAssignTenantRole(check.role, targetMembership.role)) {
    return jsonError("Acces refuse.", 403);
  }

  const { error } = await ctx.sb
    .from("tenant_memberships")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Tenant member delete error", { error: error.message, tenantId: ctx.tenant_id, userId: targetUserId });
    return jsonError("Une erreur est survenue.", 400);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
