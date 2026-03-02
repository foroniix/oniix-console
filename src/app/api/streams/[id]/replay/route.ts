import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

const ReplayStatus = z.enum(["draft", "ready", "published", "archived"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
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
      poster: z.string().nullable().optional(),
      durationSec: z.number().int().nonnegative().nullable().optional(),
      replayStatus: ReplayStatus.optional(),
      availableFrom: z.string().nullable().optional(),
      availableTo: z.string().nullable().optional(),
      channelId: z.string().nullable().optional(),
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
    console.error("Replay create stream lookup error", { error: streamError.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!stream) {
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

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
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }
  if (body.availableTo !== undefined && body.availableTo !== null && !availableToIso) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }
  if (availableFromIso && availableToIso && availableToIso <= availableFromIso) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const replayStatus = body.replayStatus ?? "ready";
  const hlsUrl = body.hlsUrl ?? stream.hls_url ?? null;
  if (replayStatus === "published" && !hlsUrl) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }

  const { data, error } = await supa
    .from("replays")
    .insert({
      tenant_id: ctx.tenantId,
      stream_id: id,
      channel_id: body.channelId ?? stream.channel_id ?? null,
      title: body.title?.trim() || stream.title || "Replay",
      synopsis: body.synopsis ?? stream.description ?? null,
      hls_url: hlsUrl,
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
    })
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Replay create error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
