// src/app/api/analytics/collect/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { touchViewerLiveSession } from "../../_utils/viewer-live";

interface AnalyticsPayload {
  sessionId: string;
  eventType: string;
  userId?: string;
  streamId?: string;
  deviceType?: string;
  os?: string;
  country?: string;
}

function normalizeEventType(eventType: string) {
  const normalized = (eventType ?? "").trim().toUpperCase();
  if (normalized === "START") return "START_STREAM";
  if (normalized === "HEARTBEAT") return "HEARTBEAT";
  if (
    normalized === "STOP" ||
    normalized === "STOP_STREAM" ||
    normalized === "END" ||
    normalized === "END_STREAM" ||
    normalized === "END_VIEW"
  ) {
    return "STOP_STREAM";
  }
  return normalized;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const parsed = await parseJson(
      req,
      z.object({
        sessionId: z.string().min(1),
        eventType: z.string().min(1),
        userId: z.string().optional(),
        streamId: z.string().optional(),
        deviceType: z.string().optional(),
        os: z.string().optional(),
        country: z.string().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body: AnalyticsPayload = parsed.data;

    if (!body.sessionId || !body.eventType) {
      return NextResponse.json({ error: "Donnees requises manquantes." }, { status: 400 });
    }

    const supa = supabaseAdmin();

    const normalizedEventType = normalizeEventType(body.eventType);

    const { error } = await supa.from("analytics_events").insert({
      tenant_id: ctx.tenantId,
      session_id: body.sessionId,
      user_id: body.userId || ctx.userId || null,
      event_type: normalizedEventType,
      stream_id: body.streamId || null,
      device_type: body.deviceType || "desktop",
      os: body.os || "Unknown",
      country: body.country || "Unknown",
    });

    if (error) throw new Error(error.message);

    const liveRes = await touchViewerLiveSession(supa, {
      tenantId: ctx.tenantId,
      sessionId: body.sessionId,
      streamId: body.streamId ?? null,
      userId: body.userId || ctx.userId || null,
      deviceType: body.deviceType || "desktop",
      eventType: normalizedEventType,
    });
    if (!liveRes.ok && !liveRes.tableMissing) {
      console.error("Analytics collect live sync error", {
        error: liveRes.error ?? "unknown",
        code: liveRes.code ?? null,
        tenantId: ctx.tenantId,
        sessionId: body.sessionId,
        streamId: body.streamId ?? null,
        eventType: normalizedEventType,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Analytics Route Error:", err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
