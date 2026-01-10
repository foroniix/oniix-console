import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../../../_utils/auth";
import { supabaseUser } from "../../../../_utils/supabase";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const body = await req.json();
  const supa = supabaseUser(ctx.accessToken);

  if (typeof body.viewers !== "number" || typeof body.bitrate !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Ensure stream belongs to tenant
  const { data: stream, error: se } = await supa
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id)
    .single();

  if (se || !stream) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supa.from("stream_stats").insert({
    tenant_id: ctx.tenantId,
    stream_id: params.id,
    viewers: body.viewers,
    bitrate_kbps: body.bitrate,
    errors: body.errors ?? 0,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
