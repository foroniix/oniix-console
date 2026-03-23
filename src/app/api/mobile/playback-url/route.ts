import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSignedPlaybackAccess,
  resolvePlaybackChannel,
} from "../../_utils/playback";
import { resolveSponsorshipDecision } from "../../_utils/sponsorship";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireTenantIngestAuth } from "../../_utils/tenant-ingest-auth";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_SCHEMA = z
  .object({
    channel_id: z.string().optional(),
    stream_id: z.string().optional(),
    session_id: z.string().uuid().optional().nullable(),
    platform: z.enum(["ios", "android"]).optional(),
    device_id: z.string().min(1).max(256).optional(),
    app_version: z.string().max(64).optional(),
    network_type: z.enum(["wifi", "4g", "5g", "unknown"]).optional(),
    operator_code: z.string().min(1).max(64).optional(),
  })
  .refine((value) => Boolean(value.channel_id?.trim() || value.stream_id?.trim()), {
    message: "channel_id or stream_id is required",
    path: ["channel_id"],
  });

function firstHeaderValue(headerValue: string | null) {
  return (headerValue ?? "").split(",")[0]?.trim() || null;
}

function mapStoredSponsorship(session: {
  sponsorship_status?: string | null;
  sponsorship_reason?: string | null;
  operator_account_id?: string | null;
  operator_offer_id?: string | null;
  sponsorship_policy_id?: string | null;
  operator_correlation_id?: string | null;
  operator_code?: string | null;
  operator_name_snapshot?: string | null;
  operator_offer_code?: string | null;
}) {
  const status = String(session.sponsorship_status ?? "not_eligible").trim() || "not_eligible";
  const normalizedStatus =
    status === "sponsored" || status === "partner_bypass" || status === "operator_unavailable"
      ? status
      : "not_eligible";

  return {
    eligible: normalizedStatus === "sponsored" || normalizedStatus === "partner_bypass",
    status: normalizedStatus,
    reason:
      String(session.sponsorship_reason ?? "operator_not_provided").trim() ||
      "operator_not_provided",
    operator_id: session.operator_account_id ?? null,
    operator_code: session.operator_code ?? null,
    operator_name: session.operator_name_snapshot ?? null,
    offer_id: session.operator_offer_id ?? null,
    offer_code: session.operator_offer_code ?? null,
    policy_id: session.sponsorship_policy_id ?? null,
    correlation_id: session.operator_correlation_id ?? null,
  };
}

export async function POST(req: Request) {
  const tenantAuth = await requireTenantIngestAuth(req);
  if (!tenantAuth.ok) return tenantAuth.res;

  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const admin = supabaseAdmin();
  const effectiveStreamId = parsed.data.stream_id?.trim() || tenantAuth.streamId?.trim() || null;

  if (tenantAuth.keySource === "token" && tenantAuth.streamId && effectiveStreamId !== tenantAuth.streamId.trim()) {
    return NextResponse.json({ ok: false, error: "Authentification playback invalide." }, { status: 401 });
  }

  const playbackRes = await resolvePlaybackChannel(admin, {
    tenantId: tenantAuth.tenantId,
    streamId: effectiveStreamId,
    channelId: parsed.data.channel_id?.trim() ?? null,
  });

  if (!playbackRes.ok) {
    return NextResponse.json({ ok: false, error: playbackRes.error }, { status: playbackRes.status });
  }

  const { channelId, tenantId } = playbackRes.value;
  const startedAt = new Date().toISOString();
  const operatorCode =
    parsed.data.operator_code?.trim() || firstHeaderValue(req.headers.get("x-oniix-operator"));
  const countryIso2 =
    firstHeaderValue(req.headers.get("x-vercel-ip-country")) ||
    firstHeaderValue(req.headers.get("cf-ipcountry"));
  let sessionId = parsed.data.session_id?.trim() ?? "";
  let sponsorship: ReturnType<typeof mapStoredSponsorship> | null = null;

  if (sessionId) {
    const { data: existingSession, error: existingSessionError } = await admin
      .from("playback_sessions")
      .select(
        "id, ended_at, sponsorship_status, sponsorship_reason, operator_account_id, operator_offer_id, sponsorship_policy_id, operator_correlation_id, operator_code, operator_name_snapshot, operator_offer_code"
      )
      .eq("id", sessionId)
      .eq("tenant_id", tenantId)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existingSessionError) {
      console.error("Playback session lookup error", {
        error: existingSessionError.message,
        code: existingSessionError.code,
        tenantId,
        channelId,
        sessionId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!existingSession || existingSession.ended_at) {
      sessionId = "";
    } else {
      const touchPayload: Record<string, string | null> = {
        app_version: parsed.data.app_version ?? null,
        network_type: parsed.data.network_type ?? "unknown",
        last_heartbeat_at: startedAt,
      };

      if (operatorCode) {
        const sponsorshipDecision = await resolveSponsorshipDecision(admin, {
          tenantId,
          channelId,
          streamId: playbackRes.value.streamId,
          operatorCode,
          countryIso2,
          nowIso: startedAt,
        });

        touchPayload.operator_account_id = sponsorshipDecision.operatorId;
        touchPayload.operator_offer_id = sponsorshipDecision.offerId;
        touchPayload.sponsorship_policy_id = sponsorshipDecision.policyId;
        touchPayload.sponsorship_status = sponsorshipDecision.status;
        touchPayload.sponsorship_reason = sponsorshipDecision.reason;
        touchPayload.operator_correlation_id = sponsorshipDecision.correlationId;
        touchPayload.operator_code = sponsorshipDecision.operatorCode;
        touchPayload.operator_name_snapshot = sponsorshipDecision.operatorName;
        touchPayload.operator_offer_code = sponsorshipDecision.offerCode;

        sponsorship = {
          eligible: sponsorshipDecision.eligible,
          status: sponsorshipDecision.status,
          reason: sponsorshipDecision.reason,
          operator_id: sponsorshipDecision.operatorId,
          operator_code: sponsorshipDecision.operatorCode,
          operator_name: sponsorshipDecision.operatorName,
          offer_id: sponsorshipDecision.offerId,
          offer_code: sponsorshipDecision.offerCode,
          policy_id: sponsorshipDecision.policyId,
          correlation_id: sponsorshipDecision.correlationId,
        };
      } else {
        sponsorship = mapStoredSponsorship(existingSession);
      }

      const { error: touchError } = await admin
        .from("playback_sessions")
        .update(touchPayload)
        .eq("id", sessionId);

      if (touchError) {
        console.error("Playback session touch error", {
          error: touchError.message,
          code: touchError.code,
          sessionId,
        });
      }
    }
  }

  if (!sessionId) {
    const sponsorshipDecision = await resolveSponsorshipDecision(admin, {
      tenantId,
      channelId,
      streamId: playbackRes.value.streamId,
      operatorCode,
      countryIso2,
      nowIso: startedAt,
    });

    const { data: session, error: sessionError } = await admin
      .from("playback_sessions")
      .insert({
        tenant_id: tenantId,
        channel_id: channelId,
        device_id: parsed.data.device_id ?? null,
        platform: parsed.data.platform ?? "android",
        app_version: parsed.data.app_version ?? null,
        network_type: parsed.data.network_type ?? "unknown",
        started_at: startedAt,
        last_heartbeat_at: startedAt,
        client_ip: firstHeaderValue(req.headers.get("x-forwarded-for")),
        country: countryIso2,
        asn: req.headers.get("x-vercel-ip-as-number") ?? req.headers.get("cf-asn"),
        operator_account_id: sponsorshipDecision.operatorId,
        operator_offer_id: sponsorshipDecision.offerId,
        sponsorship_policy_id: sponsorshipDecision.policyId,
        sponsorship_status: sponsorshipDecision.status,
        sponsorship_reason: sponsorshipDecision.reason,
        operator_correlation_id: sponsorshipDecision.correlationId,
        operator_code: sponsorshipDecision.operatorCode,
        operator_name_snapshot: sponsorshipDecision.operatorName,
        operator_offer_code: sponsorshipDecision.offerCode,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Playback session create error", {
        error: sessionError?.message ?? "unknown",
        code: sessionError?.code ?? null,
        tenantId,
        channelId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    sessionId = session.id;
    sponsorship = {
      eligible: sponsorshipDecision.eligible,
      status: sponsorshipDecision.status,
      reason: sponsorshipDecision.reason,
      operator_id: sponsorshipDecision.operatorId,
      operator_code: sponsorshipDecision.operatorCode,
      operator_name: sponsorshipDecision.operatorName,
      offer_id: sponsorshipDecision.offerId,
      offer_code: sponsorshipDecision.offerCode,
      policy_id: sponsorshipDecision.policyId,
      correlation_id: sponsorshipDecision.correlationId,
    };
  }

  const signedAccess = await createSignedPlaybackAccess({
    request: req,
    channelId,
    sessionId,
    deviceId: parsed.data.device_id ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      tenant_id: tenantId,
      channel_id: channelId,
      stream_id: playbackRes.value.streamId,
      session_id: sessionId,
      playback_url: signedAccess.playbackUrl.toString(),
      expires_at: signedAccess.expiresAt,
      sponsorship,
    },
    { status: 200 }
  );
}
