import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getTenantContext, jsonError, requireTenantAdmin } from "../_utils";
import { parseJson } from "../../_utils/validate";

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

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const { data, error } = await ctx.sb
    .from("tenant_invites")
    .select("id,email,role,code,status,created_at,expires_at")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Tenant invites load error", { error: error.message, tenantId: ctx.tenant_id });
    return jsonError("Une erreur est survenue.", 400);
  }

  const invites = (data ?? []).map(withExpired);
  return NextResponse.json({ ok: true, invites }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const parsed = await parseJson(
    req,
    z.object({
      email: z.string().email(),
      role: z.enum(["member", "admin"]).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const email = parsed.data.email.trim().toLowerCase();
  const role = parsed.data.role ?? "member";

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

  if (error) {
    console.error("Tenant invite create error", { error: error.message, tenantId: ctx.tenant_id });
    return jsonError("Une erreur est survenue.", 400);
  }

  return NextResponse.json(
    {
      ok: true,
      invite: withExpired(data),
      invite_url: `/accept-invite?code=${data.code}`,
    },
    { status: 200 }
  );
}
