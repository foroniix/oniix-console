import { NextResponse } from "next/server";
import { getTenantContext, jsonError, requireTenantAdmin } from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(_: Request, { params }: { params: { userId: string } }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Forbidden" ? 403 : 400);

  const targetUserId = params.userId;
  if (!targetUserId) return jsonError("userId manquant", 400);

  if (targetUserId === ctx.user.id) {
    return jsonError("Impossible de vous retirer vous-même (pour l'instant).", 400);
  }

  const { error } = await ctx.sb
    .from("tenant_memberships")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("user_id", targetUserId);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true }, { status: 200 });
}
