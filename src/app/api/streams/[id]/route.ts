import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

// MODIFICATION (PATCH)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const supa = supabaseUser(ctx.accessToken);

    const payload: any = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.hlsUrl !== undefined) payload.hls_url = body.hlsUrl;
    if (body.status !== undefined) payload.status = body.status;
    if (body.channelId !== undefined) payload.channel_id = body.channelId;
    if (body.description !== undefined) payload.description = body.description;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from("streams")
      .update(payload)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// SUPPRESSION (DELETE)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { id } = await params;
    const supa = supabaseUser(ctx.accessToken);

    const { error } = await supa
      .from("streams")
      .delete()
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
