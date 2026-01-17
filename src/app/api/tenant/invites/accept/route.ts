import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getTenantContext, jsonError } from "../../_utils";
import { parseJson } from "../../../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../../../_utils/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext({ requireMembership: false });
  if (!ctx.ok) return ctx.res;

  const rateLimit = getRateLimitConfig("INVITE", { limit: 5, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit, ctx.user.id);
  if (rateRes) return rateRes;

  const parsed = await parseJson(
    req,
    z.object({
      code: z.string().min(1),
    })
  );
  if (!parsed.ok) return parsed.res;
  const code = parsed.data.code.trim();

  const user = ctx.user;
  const email = (user.email || "").toLowerCase();

  const { data: invite, error: invErr } = await ctx.admin
    .from("tenant_invites")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (invErr) {
    console.error("Tenant invite accept lookup error", { error: invErr.message });
    return jsonError("Une erreur est survenue.", 400);
  }
  if (!invite) return jsonError("Invitation introuvable.", 404);

  if (invite.status !== "pending") return jsonError("Cette invitation n'est plus valable.", 400);

  const exp = invite.expires_at ? new Date(invite.expires_at).getTime() : null;
  if (exp && exp < Date.now()) {
    await ctx.admin.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
    return jsonError("Invitation expiree.", 400);
  }

  if ((invite.email || "").toLowerCase() !== email) {
    return jsonError("Cette invitation ne correspond pas a votre email.", 403);
  }

  const { error: memErr } = await ctx.admin.from("tenant_memberships").insert({
    tenant_id: invite.tenant_id,
    user_id: user.id,
    role: invite.role ?? "member",
  });

  if (memErr && !String(memErr.message).toLowerCase().includes("duplicate key")) {
    console.error("Tenant membership create error", { error: memErr.message, tenantId: invite.tenant_id });
    return jsonError("Une erreur est survenue.", 400);
  }

  await ctx.admin.from("tenant_invites").update({ status: "accepted" }).eq("id", invite.id);

  const currentTenant = (user.app_metadata as any)?.tenant_id ?? null;

  if (!currentTenant) {
    await ctx.admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(user.app_metadata as any), tenant_id: invite.tenant_id },
    });
  }

  return NextResponse.json({ ok: true, tenant_id: invite.tenant_id }, { status: 200 });
}
