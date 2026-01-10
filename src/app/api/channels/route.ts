import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";

export async function GET() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const supa = supabaseUser(ctx.accessToken);

  const { data, error } = await supa
    .from("channels")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const body = await req.json();
    const supa = supabaseUser(ctx.accessToken);

    const slug =
      body.slug && body.slug.trim() !== ""
        ? body.slug
        : body.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-");

    const { data, error } = await supa
      .from("channels")
      .insert({
        tenant_id: ctx.tenantId,
        name: body.name,
        slug,
        category: body.category ?? "Other",
        active: body.active ?? true,
        logo: body.logo ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
