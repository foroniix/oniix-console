import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const parsed = await parseJson(
    req,
    z.object({
      title: z.string().optional(),
      durationSec: z.number().int().optional(),
      thumb: z.string().nullable().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: e1 } = await supa
    .from("streams")
    .update({ status: "ENDED", updated_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select()
    .single();

  if (e1) {
    console.error("Stream end update error", { error: e1.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

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

  if (e2) {
    console.error("VOD create error", { error: e2.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({ stream, vod });
}
