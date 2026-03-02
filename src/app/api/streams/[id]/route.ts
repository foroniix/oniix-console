import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

// MODIFICATION (PATCH)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { id } = await params;
    const parsed = await parseJson(
      req,
      z.object({
        title: z.string().optional(),
        hlsUrl: z.string().optional(),
        status: z.string().optional(),
        channelId: z.string().optional(),
        description: z.string().optional(),
        scheduledAt: z.string().nullable().optional(),
        poster: z.string().nullable().optional(),
        latency: z.enum(["normal", "low", "ultra-low"]).optional(),
        dvrWindowSec: z.number().int().optional(),
        record: z.boolean().optional(),
        drm: z.boolean().optional(),
        captions: z.array(z.any()).optional(),
        markers: z.array(z.any()).optional(),
        geo: z.object({ allow: z.array(z.string()), block: z.array(z.string()) }).partial().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const supa = supabaseUser(ctx.accessToken);

    const payload: Record<string, unknown> = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.hlsUrl !== undefined) payload.hls_url = body.hlsUrl;
    if (body.status !== undefined) payload.status = body.status;
    if (body.channelId !== undefined) payload.channel_id = body.channelId;
    if (body.description !== undefined) payload.description = body.description;
    if (body.scheduledAt !== undefined) payload.scheduled_at = body.scheduledAt;
    if (body.poster !== undefined) payload.poster = body.poster;
    if (body.latency !== undefined) payload.latency = body.latency;
    if (body.dvrWindowSec !== undefined) payload.dvr_window_sec = body.dvrWindowSec;
    if (body.record !== undefined) payload.record = body.record;
    if (body.drm !== undefined) payload.drm = body.drm;
    if (body.captions !== undefined) payload.captions = body.captions;
    if (body.markers !== undefined) payload.markers = body.markers;
    if (body.geo !== undefined) payload.geo = body.geo;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from("streams")
      .update(payload)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Stream update error", { error: error.message, tenantId: ctx.tenantId, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

// SUPPRESSION (DELETE)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { id } = await params;
    const supa = supabaseUser(ctx.accessToken);

    const { error } = await supa
      .from("streams")
      .delete()
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id);

    if (error) {
      console.error("Stream delete error", { error: error.message, tenantId: ctx.tenantId, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
