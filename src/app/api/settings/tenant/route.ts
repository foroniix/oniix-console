import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const sb = supabaseUser(ctx.accessToken);

  const { data, error } = await sb
    .from("tenants")
    .select("id,name,created_at,created_by")
    .eq("id", ctx.tenantId)
    .single();

  if (error) {
    console.error("Tenant load error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const sb = supabaseUser(ctx.accessToken);

  const parsed = await parseJson(
    req,
    z.object({
      name: z.string().min(2).max(120),
    })
  );
  if (!parsed.ok) return parsed.res;
  const name = parsed.data.name.trim();

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Nom invalide (min 2 caracteres)." }, { status: 400 });
  }

  const { data, error } = await sb
    .from("tenants")
    .update({ name })
    .eq("id", ctx.tenantId)
    .select("id,name,created_at,created_by")
    .single();

  if (error) {
    console.error("Tenant update error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}
