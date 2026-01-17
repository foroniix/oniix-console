import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const sb = supabaseUser(ctx.accessToken);

  const { data, error } = await sb
    .from("tenants")
    .select("id,name,created_at,created_by")
    .eq("id", ctx.tenantId)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const sb = supabaseUser(ctx.accessToken);

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Nom invalide (min 2 caractères)" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("tenants")
    .update({ name })
    .eq("id", ctx.tenantId)
    .select("id,name,created_at,created_by")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant: data }, { status: 200 });
}
