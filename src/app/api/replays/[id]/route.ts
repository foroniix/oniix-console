import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditLog } from "../../_utils/audit";
import { canTransitionReplayStatus } from "../../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

const ReplayStatus = z.enum(["draft", "processing", "ready", "published", "archived"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isNotFound(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function invalidTransitionResponse() {
  return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
}

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await params;
  const parsed = await parseJson(
    req,
    z.object({
      streamId: z.string().nullable().optional(),
      channelId: z.string().nullable().optional(),
      title: z.string().min(1).optional(),
      synopsis: z.string().nullable().optional(),
      hlsUrl: z.string().nullable().optional(),
      poster: z.string().nullable().optional(),
      durationSec: z.number().int().nonnegative().nullable().optional(),
      replayStatus: ReplayStatus.optional(),
      availableFrom: z.string().nullable().optional(),
      availableTo: z.string().nullable().optional(),
      geo: z
        .object({
          allow: z.array(z.string()).optional(),
          block: z.array(z.string()).optional(),
        })
        .optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const { data: current, error: currentError } = await ctx.sb
    .from("replays")
    .select("id, stream_id, hls_url, available_from, available_to, replay_status")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Replay lookup error", { error: currentError.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  if (
    body.replayStatus !== undefined &&
    !canTransitionReplayStatus(
      current.replay_status as "draft" | "processing" | "ready" | "published" | "archived",
      body.replayStatus
    )
  ) {
    return invalidTransitionResponse();
  }

  if (body.streamId !== undefined && body.streamId !== null) {
    const { data: stream, error: streamError } = await ctx.sb
      .from("streams")
      .select("id")
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", body.streamId)
      .maybeSingle();
    if (streamError) {
      console.error("Replay update stream lookup error", {
        error: streamError.message,
        tenantId: ctx.tenant_id,
        id,
        streamId: body.streamId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (!stream) return notFoundResponse();
  }

  const availableFromIso =
    body.availableFrom === undefined
      ? current.available_from
      : body.availableFrom === null
        ? null
        : toIsoDate(body.availableFrom);
  const availableToIso =
    body.availableTo === undefined
      ? current.available_to
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

  const nextStatus = body.replayStatus ?? current.replay_status;
  const nextHlsUrl = body.hlsUrl !== undefined ? body.hlsUrl : current.hls_url;
  if (nextStatus === "published" && !nextHlsUrl) return invalidResponse();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: ctx.user_id,
  };

  if (body.streamId !== undefined) updateData.stream_id = body.streamId;
  if (body.channelId !== undefined) updateData.channel_id = body.channelId;
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.synopsis !== undefined) updateData.synopsis = body.synopsis;
  if (body.hlsUrl !== undefined) updateData.hls_url = body.hlsUrl;
  if (body.poster !== undefined) updateData.poster = body.poster;
  if (body.durationSec !== undefined) updateData.duration_sec = body.durationSec;
  if (body.replayStatus !== undefined) updateData.replay_status = body.replayStatus;
  if (body.availableFrom !== undefined) updateData.available_from = availableFromIso;
  if (body.availableTo !== undefined) updateData.available_to = availableToIso;
  if (body.geo !== undefined) {
    updateData.geo = {
      allow: body.geo.allow ?? [],
      block: body.geo.block ?? [],
    };
  }

  const { data, error } = await ctx.sb
    .from("replays")
    .update(updateData)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    if (isNotFound(error)) return notFoundResponse();
    console.error("Replay update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action:
      current.replay_status !== "published" && data.replay_status === "published"
        ? "replay.publish"
        : "replay.update",
    targetType: "replay",
    targetId: data.id,
    metadata: {
      previousStatus: current.replay_status,
      nextStatus: data.replay_status,
      changedFields: Object.keys(updateData),
    },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await params;
  const { data: current, error: currentError } = await ctx.sb
    .from("replays")
    .select("id, replay_status, title, stream_id, channel_id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
      console.error("Replay lookup before delete error", {
        error: currentError.message,
        tenantId: ctx.tenant_id,
        id,
      });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  const { data, error } = await ctx.sb
    .from("replays")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Replay delete error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!data) return notFoundResponse();

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "replay.delete",
    targetType: "replay",
    targetId: current.id,
    metadata: {
      replayStatus: current.replay_status,
      title: current.title,
      streamId: current.stream_id ?? null,
      channelId: current.channel_id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
