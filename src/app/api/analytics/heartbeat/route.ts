import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "../../tenant/_utils";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { touchViewerLiveSession } from "../../_utils/viewer-live";
import { requireAnalyticsRuntimeAuth } from "../_runtime-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeEventType(input?: string, kind?: string) {
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
  if (normalizedType === "HEARTBEAT") return "HEARTBEAT";
  return "HEARTBEAT";
}

export async function POST(req: Request) {
  const parsed = await parseJson(
    req,
    z.object({
      session_id: z.string().min(1),
      stream_id: z.string().optional(),
      device: z.string().optional(),
      event_type: z.string().optional(),
      kind: z.string().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const session_id = parsed.data.session_id.trim();
  const stream_id = parsed.data.stream_id?.trim() ?? null;
  const device = parsed.data.device?.trim() ?? null;
  const eventType = normalizeEventType(parsed.data.event_type, parsed.data.kind);

  const auth = await requireAnalyticsRuntimeAuth(req);
  if (!auth.ok) return auth.res;

  const tenantId = auth.tenantId;
  const userId = auth.userId;

  if (auth.source === "ingest" && auth.streamId) {
    const scopedStreamId = auth.streamId.trim();
    const requestedStreamId = stream_id?.trim() ?? "";
    if (!requestedStreamId || requestedStreamId !== scopedStreamId) {
      return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
    }
  }

  const admin = supabaseAdmin();

  if (!session_id) return jsonError("Donnee requise manquante.", 400);
  if (!tenantId) return jsonError("Acces refuse.", 403);

  const { error } = await admin.from("analytics_events").insert({
    tenant_id: tenantId,
    stream_id,
    session_id,
    user_id: userId,
    event_type: eventType,
    device_type: device,
  });

  if (error) {
    console.error("Analytics heartbeat error", { error: error.message, tenantId });
    return jsonError("Une erreur est survenue.", 400);
  }

  const liveRes = await touchViewerLiveSession(admin, {
    tenantId,
    sessionId: session_id,
    streamId: stream_id,
    userId,
    deviceType: device,
    eventType,
  });
  if (!liveRes.ok && !liveRes.tableMissing) {
    console.error("Analytics heartbeat live sync error", {
      error: liveRes.error ?? "unknown",
      code: liveRes.code ?? null,
      tenantId,
      sessionId: session_id,
      streamId: stream_id,
      eventType,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
