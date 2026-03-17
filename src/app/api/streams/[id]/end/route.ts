import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "operate_live");
  if (!permission.ok) return jsonError(permission.error, 403);

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

  const { data: stream, error: e1 } = await ctx.sb
    .from("streams")
    .update({ status: "ENDED", updated_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select()
    .single();

  if (e1) {
    console.error("Stream end update error", { error: e1.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const { data: vod, error: e2 } = await ctx.sb
    .from("vods")
    .insert({
      tenant_id: ctx.tenant_id,
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
    console.error("VOD create error", { error: e2.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({ stream, vod });
}
