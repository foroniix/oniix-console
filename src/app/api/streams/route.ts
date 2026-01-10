import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const channelId = url.searchParams.get("channelId");

  const supa = supabaseUser(ctx.accessToken);

  let q = supa
    .from("streams")
    .select("*, channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  if (channelId) q = q.eq("channel_id", channelId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const body = await req.json();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
