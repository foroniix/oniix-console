// src/app/api/analytics/collect/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { touchViewerLiveSession } from "../../_utils/viewer-live";
import { requireAnalyticsRuntimeAuth } from "../_runtime-auth";

interface AnalyticsPayload {
  sessionId: string;
  eventType: string;
  userId?: string | null;
  streamId?: string | null;
  deviceType?: string | null;
  os?: string | null;
  country?: string | null;
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
  const auth = await requireAnalyticsRuntimeAuth(req);
  if (!auth.ok) return auth.res;

  try {
    const parsed = await parseJson(
      req,
      z.object({
        sessionId: z.string().min(1).optional(),
        session_id: z.string().min(1).optional(),
        eventType: z.string().min(1).optional(),
        event_type: z.string().min(1).optional(),
        userId: z.string().optional().nullable(),
        user_id: z.string().optional().nullable(),
        streamId: z.string().optional().nullable(),
        stream_id: z.string().optional().nullable(),
        deviceType: z.string().optional().nullable(),
        device: z.string().optional().nullable(),
        os: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body: AnalyticsPayload = {
      sessionId: parsed.data.sessionId ?? parsed.data.session_id ?? "",
      eventType: parsed.data.eventType ?? parsed.data.event_type ?? "",
      userId: parsed.data.userId ?? parsed.data.user_id ?? null,
      streamId: parsed.data.streamId ?? parsed.data.stream_id ?? null,
      deviceType: parsed.data.deviceType ?? parsed.data.device ?? null,
      os: parsed.data.os ?? null,
      country: parsed.data.country ?? null,
    };

    if (!body.sessionId || !body.eventType) {
      return NextResponse.json({ error: "Donnees requises manquantes." }, { status: 400 });
    }

    if (auth.source === "ingest" && auth.streamId) {
      const scopedStreamId = auth.streamId.trim();
      const requestedStreamId = body.streamId?.trim() ?? "";
      if (!requestedStreamId || requestedStreamId !== scopedStreamId) {
        return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
      }
    }

    const supa = supabaseAdmin();

    const normalizedEventType = normalizeEventType(body.eventType);

    const { error } = await supa.from("analytics_events").insert({
      tenant_id: auth.tenantId,
      session_id: body.sessionId,
      user_id: body.userId || auth.userId || null,
      event_type: normalizedEventType,
      stream_id: body.streamId || null,
      device_type: body.deviceType || "desktop",
      os: body.os || "Unknown",
      country: body.country || "Unknown",
    });

    if (error) throw new Error(error.message);

    const liveRes = await touchViewerLiveSession(supa, {
      tenantId: auth.tenantId,
      sessionId: body.sessionId,
      streamId: body.streamId ?? null,
      userId: body.userId || auth.userId || null,
      deviceType: body.deviceType || "desktop",
      eventType: normalizedEventType,
    });
    if (!liveRes.ok && !liveRes.tableMissing) {
      console.error("Analytics collect live sync error", {
        error: liveRes.error ?? "unknown",
        code: liveRes.code ?? null,
        tenantId: auth.tenantId,
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
