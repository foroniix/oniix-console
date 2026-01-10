import { NextResponse } from "next/server";
import { getTenantContext, jsonError } from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return jsonError("Code manquant", 400);

  const { data: u } = await ctx.sb.auth.getUser();
  const user = u?.user;
  if (!user) return jsonError("Invalid session", 401);

  const email = (user.email || "").toLowerCase();

  // Lire l’invite via service role (pour accepter même si pas encore membre)
  const { data: invite, error: invErr } = await ctx.admin
    .from("tenant_invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (invErr) return jsonError(invErr.message, 400);
  if (!invite) return jsonError("Invite inconnue", 404);

  if (invite.status !== "pending") return jsonError("Invite déjà utilisée / invalide", 400);

  const exp = invite.expires_at ? new Date(invite.expires_at).getTime() : null;
  if (exp && exp < Date.now()) {
    await ctx.admin.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
    return jsonError("Invite expirée", 400);
  }

  if ((invite.email || "").toLowerCase() !== email) {
    return jsonError("Cette invite ne correspond pas à votre email", 403);
  }

  // Créer membership
  const { error: memErr } = await ctx.admin.from("tenant_memberships").insert({
    tenant_id: invite.tenant_id,
    user_id: user.id,
    role: invite.role ?? "member",
  });

  if (memErr && !String(memErr.message).toLowerCase().includes("duplicate key")) {
    return jsonError(memErr.message, 400);
  }

  // Marquer accepted
  await ctx.admin.from("tenant_invites").update({ status: "accepted" }).eq("id", invite.id);

  // Optionnel : définir tenant_id par défaut si absent
  const currentTenant =
    (user.app_metadata as any)?.tenant_id ??
    (user.user_metadata as any)?.tenant_id ??
    null;

  if (!currentTenant) {
    await ctx.admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(user.app_metadata as any), tenant_id: invite.tenant_id },
    });
  }

  return NextResponse.json({ ok: true, tenant_id: invite.tenant_id }, { status: 200 });
}
