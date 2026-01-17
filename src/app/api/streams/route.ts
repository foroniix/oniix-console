import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";
import { parseJson, parseQuery } from "../_utils/validate";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const query = parseQuery(
    req,
    z.object({
      status: z.string().optional(),
      channelId: z.string().optional(),
    })
  );
  if (!query.ok) return query.res;
  const status = query.data.status ?? null;
  const channelId = query.data.channelId ?? null;

  const supa = supabaseUser(ctx.accessToken);

  let q = supa
    .from("streams")
    .select("*, channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (channelId) q = q.eq("channel_id", channelId);

  const { data, error } = await q;
  if (error) {
    console.error("Streams load error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const parsed = await parseJson(
    req,
    z.object({
      channelId: z.string().optional(),
      title: z.string().optional(),
      hlsUrl: z.string().optional(),
      status: z.string().optional(),
      scheduledAt: z.string().optional(),
      description: z.string().optional(),
      poster: z.string().nullable().optional(),
      latency: z.string().optional(),
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

  const { data, error } = await supa
    .from("streams")
    .insert({
      tenant_id: ctx.tenantId,
      channel_id: body.channelId,
      title: body.title,
      hls_url: body.hlsUrl,
      status: body.status ?? "OFFLINE",
      scheduled_at: body.scheduledAt ?? null,
      description: body.description ?? null,
      poster: body.poster ?? null,
      latency: body.latency ?? "normal",
      dvr_window_sec: body.dvrWindowSec ?? 10800,
      record: body.record ?? true,
      drm: body.drm ?? false,
      captions: body.captions ?? [],
      markers: body.markers ?? [],
      geo: body.geo ?? { allow: [], block: [] },
    })
    .select()
    .single();

  if (error) {
    console.error("Stream create error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
