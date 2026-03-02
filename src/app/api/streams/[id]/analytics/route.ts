import { NextResponse, type NextRequest } from "next/server";

import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

type Params = { params: Promise<{ id: string }> };

type StreamStatRow = {
  viewers: number | null;
  bitrate_kbps: number | null;
  errors: number | null;
  created_at: string;
};

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function GET(_: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: streamError } = await supa
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .single();

  if (streamError || !stream) {
    if (streamError) {
      console.error("Stream analytics lookup error", {
        error: streamError.message,
        tenantId: ctx.tenantId,
        id,
      });
    }
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supa
    .from("stream_stats")
    .select("viewers,bitrate_kbps,errors,created_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("stream_id", id)
    .gte("created_at", since24h)
    .order("created_at", { ascending: true })
    .limit(6000);

  if (error) {
    console.error("Stream analytics load error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const rows = (data ?? []) as StreamStatRow[];
  const last = rows.at(-1);
  const rows1h = rows.filter((row) => row.created_at >= since1h);

  const viewers24h = rows.map((row) => toNumber(row.viewers));
  const viewers1h = rows1h.map((row) => toNumber(row.viewers));
  const bitrate1h = rows1h.map((row) => toNumber(row.bitrate_kbps));

  const errors24h = rows.reduce((sum, row) => sum + toNumber(row.errors), 0);
  const errors1h = rows1h.reduce((sum, row) => sum + toNumber(row.errors), 0);

  return NextResponse.json(
    {
      ok: true,
      generated_at: new Date().toISOString(),
      current: {
        viewers: toNumber(last?.viewers),
        bitrateKbps: toNumber(last?.bitrate_kbps),
        errors: toNumber(last?.errors),
        updatedAt: last?.created_at ?? null,
      },
      summary: {
        viewersNow: toNumber(last?.viewers),
        viewersAvg1h: Math.round(average(viewers1h)),
        viewersPeak1h: Math.max(0, ...viewers1h),
        viewersPeak24h: Math.max(0, ...viewers24h),
        bitrateAvg1h: Math.round(average(bitrate1h)),
        errors1h,
        errors24h,
      },
      series24h: rows.map((row) => ({
        ts: row.created_at,
        viewers: toNumber(row.viewers),
        bitrateKbps: toNumber(row.bitrate_kbps),
        errors: toNumber(row.errors),
      })),
    },
    { status: 200 }
  );
}
