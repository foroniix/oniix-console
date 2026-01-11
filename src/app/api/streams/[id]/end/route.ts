import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const body = await req.json().catch(() => ({}));
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: e1 } = await supa
    .from("streams")
    .update({ status: "ENDED", updated_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select()
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: vod, error: e2 } = await supa
    .from("vods")
    .insert({
      tenant_id: ctx.tenantId,
      channel_id: stream.channel_id,
      title: body.title ?? stream.title,
      hls_url: stream.hls_url,
      duration_sec: body.durationSec ?? null,
      thumb: body.thumb ?? null,
      tags: ["replay"],
      source_stream_id: stream.id,
    })
    .select()
    .single();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ stream, vod });
}
