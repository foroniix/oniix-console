import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireTenantIngestAuth } from "../../_utils/tenant-ingest-auth";
import { parseJson } from "../../_utils/validate";
import { touchViewerLiveSession } from "../../_utils/viewer-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeEventType(input: string | undefined, kind: string | undefined) {
  const normalizedKind = (kind ?? "").trim().toUpperCase();
  if (normalizedKind === "START") return "START_STREAM";
  if (normalizedKind === "HEARTBEAT") return "HEARTBEAT";
  if (
    normalizedKind === "STOP" ||
    normalizedKind === "STOP_STREAM" ||
    normalizedKind === "END" ||
    normalizedKind === "END_STREAM" ||
    normalizedKind === "END_VIEW"
  ) {
    return "STOP_STREAM";
  }

  const normalizedType = (input ?? "").trim().toUpperCase();
  if (normalizedType === "START" || normalizedType === "START_STREAM") return "START_STREAM";
  if (
    normalizedType === "STOP" ||
    normalizedType === "STOP_STREAM" ||
    normalizedType === "END" ||
    normalizedType === "END_STREAM" ||
    normalizedType === "END_VIEW"
  ) {
    return "STOP_STREAM";
  }
  return "HEARTBEAT";
}

export async function POST(req: Request) {
  const rateLimit = getRateLimitConfig("ANALYTICS_INGEST", { limit: 240, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit);
  if (rateRes) return rateRes;

  const tenantAuth = await requireTenantIngestAuth(req);
  if (!tenantAuth.ok) return tenantAuth.res;
  const { tenantId } = tenantAuth;

  const admin = supabaseAdmin();

  const parsed = await parseJson(
    req,
    z.object({
      session_id: z.string().min(1).max(160),
      stream_id: z.string().min(1).max(160),
      device: z.string().max(80).optional(),
      event_type: z.string().max(64).optional(),
      kind: z.string().max(32).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;

  const sessionId = parsed.data.session_id.trim();
  const streamId = parsed.data.stream_id.trim();
  const device = parsed.data.device?.trim() ?? null;
  const eventType = normalizeEventType(parsed.data.event_type, parsed.data.kind);

  if (tenantAuth.keySource === "token") {
    // Ingest tokens must always be scoped to one stream.
    if (!tenantAuth.streamId || tenantAuth.streamId !== streamId) {
      return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
    }
  }

  if (!sessionId || !streamId) {
    return NextResponse.json({ ok: false, error: "Donnee requise manquante." }, { status: 400 });
  }

  const { data: stream, error: streamError } = await admin
    .from("streams")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", streamId)
    .maybeSingle();

  if (streamError) {
    console.error("Analytics ingest stream lookup error", {
      error: streamError.message,
      tenantId,
      streamId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!stream) {
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const { error: insertError } = await admin.from("analytics_events").insert({
    tenant_id: tenantId,
    stream_id: streamId,
    session_id: sessionId,
    user_id: null,
    event_type: eventType,
    device_type: device,
  });

  if (insertError) {
    console.error("Analytics ingest insert error", {
      error: insertError.message,
      tenantId,
      streamId,
      eventType,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const liveRes = await touchViewerLiveSession(admin, {
    tenantId,
    sessionId,
    streamId,
    userId: null,
    deviceType: device,
    eventType,
  });
  if (!liveRes.ok && !liveRes.tableMissing) {
    console.error("Analytics ingest live sync error", {
      error: liveRes.error ?? "unknown",
      code: liveRes.code ?? null,
      tenantId,
      sessionId,
      streamId,
      eventType,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
