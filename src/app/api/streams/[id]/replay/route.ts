import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireTenant } from "../../../_utils/auth";
import { auditLog } from "../../../_utils/audit";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

const ReplayStatus = z.enum(["draft", "processing", "ready", "published", "archived"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function isMissingSchemaError(code?: string | null) {
  return code === "42P01" || code === "PGRST205" || code === "42703";
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;
  const parsed = await parseJson(
    req,
    z.object({
      title: z.string().optional(),
      synopsis: z.string().nullable().optional(),
      hlsUrl: z.string().nullable().optional(),
      sourceHlsUrl: z.string().nullable().optional(),
      poster: z.string().nullable().optional(),
      durationSec: z.number().int().nonnegative().nullable().optional(),
      replayStatus: ReplayStatus.optional(),
      availableFrom: z.string().nullable().optional(),
      availableTo: z.string().nullable().optional(),
      channelId: z.string().nullable().optional(),
      clipStartAt: z.string().nullable().optional(),
      clipEndAt: z.string().nullable().optional(),
      baseUrl: z.string().nullable().optional(),
      endStream: z.boolean().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: streamError } = await supa
    .from("streams")
    .select("id, title, description, hls_url, poster, channel_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (streamError) {
    console.error("Replay create stream lookup error", {
      error: streamError.message,
      tenantId: ctx.tenantId,
      id,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!stream) {
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const wantsClipWindow = body.clipStartAt !== undefined || body.clipEndAt !== undefined;
  if (wantsClipWindow && (!body.clipStartAt || !body.clipEndAt)) return invalidResponse();

  const clipStartIso = body.clipStartAt ? toIsoDate(body.clipStartAt) : null;
  const clipEndIso = body.clipEndAt ? toIsoDate(body.clipEndAt) : null;
  if (wantsClipWindow && (!clipStartIso || !clipEndIso || clipEndIso <= clipStartIso)) {
    return invalidResponse();
  }
  if (wantsClipWindow && body.replayStatus === "published") return invalidResponse();

  const availableFromIso =
    body.availableFrom === undefined
      ? undefined
      : body.availableFrom === null
        ? null
        : toIsoDate(body.availableFrom);
  const availableToIso =
    body.availableTo === undefined
      ? undefined
      : body.availableTo === null
        ? null
        : toIsoDate(body.availableTo);

  if (body.availableFrom !== undefined && body.availableFrom !== null && !availableFromIso) {
    return invalidResponse();
  }
  if (body.availableTo !== undefined && body.availableTo !== null && !availableToIso) {
    return invalidResponse();
  }
  if (availableFromIso && availableToIso && availableToIso <= availableFromIso) {
    return invalidResponse();
  }

  const shouldEndStream = body.endStream ?? !wantsClipWindow;
  if (shouldEndStream) {
    const { error: streamUpdateError } = await supa
      .from("streams")
      .update({ status: "ENDED", updated_at: new Date().toISOString() })
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id);
    if (streamUpdateError) {
      console.error("Replay create stream update error", {
        error: streamUpdateError.message,
        tenantId: ctx.tenantId,
        id,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
  }

  const now = new Date().toISOString();
  const replayStatus = wantsClipWindow ? "processing" : (body.replayStatus ?? "ready");

  const sourceHlsUrl = [body.sourceHlsUrl, stream.hls_url]
    .find((candidate) => typeof candidate === "string" && candidate.trim().length > 0)
    ?.trim() ?? null;

  const outputHlsUrl = wantsClipWindow ? null : (body.hlsUrl ?? stream.hls_url ?? null);
  if (!wantsClipWindow && replayStatus === "published" && !outputHlsUrl) return invalidResponse();
  if (wantsClipWindow && !sourceHlsUrl) return invalidResponse();

  const replayInsert: Record<string, unknown> = {
    tenant_id: ctx.tenantId,
    stream_id: id,
    channel_id: body.channelId ?? stream.channel_id ?? null,
    title: body.title?.trim() || stream.title || "Replay",
    synopsis: body.synopsis ?? stream.description ?? null,
    hls_url: outputHlsUrl,
    poster: body.poster ?? stream.poster ?? null,
    duration_sec: body.durationSec ?? null,
    replay_status: replayStatus,
    available_from:
      replayStatus === "published" ? (availableFromIso ?? now) : (availableFromIso ?? null),
    available_to: availableToIso ?? null,
    geo: { allow: [], block: [] },
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: now,
    updated_at: now,
  };

  if (wantsClipWindow) {
    replayInsert.hls_url = null;
    replayInsert.replay_status = "processing";
    replayInsert.source_hls_url = sourceHlsUrl;
    replayInsert.clip_start_at = clipStartIso;
    replayInsert.clip_end_at = clipEndIso;
    replayInsert.generated_manifest = null;
    replayInsert.processing_error = null;
    replayInsert.last_processed_at = null;
  }

  const { data, error } = await supa
    .from("replays")
    .insert(replayInsert)
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Replay create error", { error: error.message, code: error.code, tenantId: ctx.tenantId, id });
    if (wantsClipWindow && isMissingSchemaError(error.code)) {
      return NextResponse.json({ error: "Migration manquante pour le mode replay clip." }, { status: 503 });
    }
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  let clipJob:
    | {
        id: string;
        status: string | null;
        created_at: string | null;
      }
    | null = null;

  if (wantsClipWindow) {
    const baseUrl = (body.baseUrl ?? req.nextUrl.origin).replace(/\/$/, "");
    const { data: job, error: jobError } = await supa
      .from("replay_generation_jobs")
      .insert({
        tenant_id: ctx.tenantId,
        replay_id: data.id,
        stream_id: id,
        source_hls_url: sourceHlsUrl,
        clip_start_at: clipStartIso,
        clip_end_at: clipEndIso,
        requested_by: ctx.userId,
        base_url: baseUrl,
        status: "queued",
        attempts: 0,
        error: null,
        result: {},
        created_at: now,
        updated_at: now,
      })
      .select("id,status,created_at")
      .single();

    if (jobError) {
      console.error("Replay clip job create error", {
        error: jobError.message,
        code: jobError.code,
        tenantId: ctx.tenantId,
        replayId: data.id,
      });

      await supa
        .from("replays")
        .update({
          replay_status: "draft",
          processing_error: jobError.message,
          updated_at: new Date().toISOString(),
          updated_by: ctx.userId,
        })
        .eq("tenant_id", ctx.tenantId)
        .eq("id", data.id);

      if (isMissingSchemaError(jobError.code)) {
        return NextResponse.json({ error: "Migration manquante: table replay_generation_jobs indisponible." }, { status: 503 });
      }
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    clipJob = job;
  }

  if (shouldEndStream) {
    await auditLog({
      sb: supa,
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: "STREAM_ENDED_FOR_REPLAY",
      targetType: "stream",
      targetId: id,
      metadata: {
        streamStatus: "ENDED",
        replayId: data.id,
        replayStatus: data.replay_status ?? null,
      },
    });
  }

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: wantsClipWindow ? "replay.clip_requested" : "replay.create",
    targetType: "replay",
    targetId: data.id,
    metadata: {
      replayStatus: data.replay_status ?? null,
      streamId: id,
      clipStartAt: clipStartIso,
      clipEndAt: clipEndIso,
      sourceHlsUrl,
      clipJobId: clipJob?.id ?? null,
    },
  });

  return NextResponse.json(
    {
      ...data,
      clipJob,
    },
    { status: 201 }
  );
}
