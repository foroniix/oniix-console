import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const body = await req.json();
  const supa = supabaseUser(ctx.accessToken);

  await supa
    .from("streams")
    .update({ status: "ENDED", updated_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id);

  const { data, error } = await supa
    .from("replays")
    .insert({
      tenant_id: ctx.tenantId,
      stream_id: id,
      title: body.title,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
