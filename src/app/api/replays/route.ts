import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../_utils/auth";
import { auditLog } from "../_utils/audit";
import { supabaseUser } from "../_utils/supabase";
import { parseJson, parseQuery } from "../_utils/validate";

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

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const query = parseQuery(
    req,
    z.object({
      status: ReplayStatus.optional(),
      channelId: z.string().optional(),
      streamId: z.string().optional(),
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(300).optional(),
    })
  );
  if (!query.ok) return query.res;

  const fromIso = toIsoDate(query.data.from);
  const toIso = toIsoDate(query.data.to);
  if (query.data.from && !fromIso) return invalidResponse();
  if (query.data.to && !toIso) return invalidResponse();

  const supa = supabaseUser(ctx.accessToken);
  let q = supa
    .from("replays")
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  if (query.data.status) q = q.eq("replay_status", query.data.status);
  if (query.data.channelId) q = q.eq("channel_id", query.data.channelId);
  if (query.data.streamId) q = q.eq("stream_id", query.data.streamId);
  if (query.data.search) q = q.ilike("title", `%${query.data.search}%`);
  if (fromIso) q = q.gte("created_at", fromIso);
  if (toIso) q = q.lte("created_at", toIso);
  if (query.data.limit) q = q.limit(query.data.limit);

  const { data, error } = await q;
  if (error) {
    console.error("Replays load error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
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
  const supa = supabaseUser(ctx.accessToken);

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

  let streamDefaults: {
    id: string;
    title: string | null;
    description: string | null;
    hls_url: string | null;
    poster: string | null;
    channel_id: string | null;
  } | null = null;

  if (body.streamId) {
    const { data: stream, error: streamError } = await supa
      .from("streams")
      .select("id, title, description, hls_url, poster, channel_id")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", body.streamId)
      .maybeSingle();

    if (streamError) {
      console.error("Replay create stream lookup error", {
        error: streamError.message,
        tenantId: ctx.tenantId,
        streamId: body.streamId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (!stream) return notFoundResponse();
    streamDefaults = stream;
  }

  const now = new Date().toISOString();
  const replayStatus = body.replayStatus ?? "draft";
  const hlsUrl = body.hlsUrl ?? streamDefaults?.hls_url ?? null;
  if (replayStatus === "published" && !hlsUrl) return invalidResponse();

  const effectiveAvailableFrom =
    replayStatus === "published" ? (availableFromIso ?? now) : (availableFromIso ?? null);
  const effectiveAvailableTo = availableToIso ?? null;

  const { data, error } = await supa
    .from("replays")
    .insert({
      tenant_id: ctx.tenantId,
      stream_id: body.streamId ?? null,
      channel_id: body.channelId ?? streamDefaults?.channel_id ?? null,
      title: body.title?.trim() || streamDefaults?.title || "Replay",
      synopsis: body.synopsis ?? streamDefaults?.description ?? null,
      hls_url: hlsUrl,
      poster: body.poster ?? streamDefaults?.poster ?? null,
      duration_sec: body.durationSec ?? null,
      replay_status: replayStatus,
      available_from: effectiveAvailableFrom,
      available_to: effectiveAvailableTo,
      geo: {
        allow: body.geo?.allow ?? [],
        block: body.geo?.block ?? [],
      },
      created_by: ctx.userId,
      updated_by: ctx.userId,
      updated_at: now,
    })
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Replay create error", { error: error.message, tenantId: ctx.tenantId });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: data.replay_status === "published" ? "replay.publish" : "replay.create",
    targetType: "replay",
    targetId: data.id,
    metadata: {
      title: data.title,
      replayStatus: data.replay_status,
      streamId: data.stream_id ?? null,
      channelId: data.channel_id ?? null,
    },
  });

  return NextResponse.json(data, { status: 201 });
}
