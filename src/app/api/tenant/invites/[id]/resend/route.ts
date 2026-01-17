import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getTenantContext, jsonError, requireTenantAdmin } from "../../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Renvoyer une invitation:
// - regen code
// - remet status = pending
// - (optionnel) peut etendre expires_at si la DB n'a pas de trigger
// Appelle: POST /api/tenant/invites/:id/resend
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const id = (params as any)?.id ?? Object.values(params ?? {})[0];
  if (!id) return jsonError("Identifiant manquant.", 400);

  const { data: inv, error: invErr } = await ctx.sb
    .from("tenant_invites")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (invErr) {
    console.error("Tenant invite lookup error", { error: invErr.message, tenantId: ctx.tenant_id, id });
    return jsonError("Une erreur est survenue.", 400);
  }
  if (!inv) return jsonError("Invitation introuvable.", 404);
  if ((inv as any).tenant_id !== ctx.tenant_id) return jsonError("Acces refuse.", 403);
  if ((inv as any).status === "accepted") return jsonError("Cette invitation a deja ete acceptee.", 400);

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
      invite: data,
      invite_url: `/accept-invite?code=${data.code}`,
    },
    { status: 200 }
  );
}
