import type { SupabaseClient } from "@supabase/supabase-js";
import { createOriginRef, verifyOriginRef } from "../../../../shared/ott/origin-ref";
import { createPlaybackToken, verifyPlaybackToken } from "../../../../shared/ott/hls-token";
import { ENV } from "./env";

type ResolvedPlaybackChannel = {
  tenantId: string;
  channelId: string;
  originHlsUrl: string;
  streamId: string | null;
};

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function isChannelActive(row: { active?: boolean | null; is_active?: boolean | null }) {
  return Boolean(row.active ?? row.is_active ?? true);
}

export function getPlaybackTokenSecret() {
  return (
    process.env.PLAYBACK_TOKEN_SECRET?.trim() ||
    process.env.HLS_TOKEN_SECRET?.trim() ||
    ENV.SUPABASE_SERVICE_ROLE_KEY()
  );
}

export function getOriginRefSecret() {
  return (
    process.env.PLAYBACK_ORIGIN_REF_SECRET?.trim() ||
    process.env.ORIGIN_REF_SECRET?.trim() ||
    getPlaybackTokenSecret()
  );
}

export function getPlaybackBaseUrl(request: Request) {
  const configured =
    process.env.PLAYBACK_STREAM_BASE_URL?.trim() || process.env.STREAM_BASE_URL?.trim() || "";
  if (configured) return configured.replace(/\/+$/g, "");
  return `${new URL(request.url).origin}/api/playback`;
}

export function buildPlaybackUrl(request: Request, channelId: string, fileName: string, token: string) {
  const baseUrl = getPlaybackBaseUrl(request);
  const url = new URL(`${baseUrl}/hls/${encodeURIComponent(channelId)}/${encodeURIComponent(fileName)}`);
  url.searchParams.set("token", token);
  return url;
}

export async function createSignedPlaybackAccess(input: {
  request: Request;
  channelId: string;
  sessionId: string;
  deviceId?: string | null;
}) {
  const tokenSecret = getPlaybackTokenSecret();
  const signedToken = await createPlaybackToken({
    secret: tokenSecret,
    channelId: input.channelId,
    sessionId: input.sessionId,
    deviceId: clean(input.deviceId),
  });
  return {
    token: signedToken.token,
    expiresAt: signedToken.expiresAt,
    playbackUrl: buildPlaybackUrl(input.request, input.channelId, "master.m3u8", signedToken.token),
  };
}

export async function makePlaybackOriginRef(channelId: string, absoluteUrl: string, exp: number) {
  return createOriginRef({
    secret: getOriginRefSecret(),
    channelId,
    url: absoluteUrl,
    exp,
  });
}

export async function readPlaybackOriginRef(channelId: string, ref: string) {
  return verifyOriginRef({
    secret: getOriginRefSecret(),
    channelId,
    ref,
  });
}

export async function verifyPlaybackAccessToken(channelId: string, token: string) {
  return verifyPlaybackToken({
    token,
    secret: getPlaybackTokenSecret(),
    channelId,
  });
}

export async function resolvePlaybackChannel(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    streamId?: string | null;
    channelId?: string | null;
  }
): Promise<
  | { ok: true; value: ResolvedPlaybackChannel }
  | { ok: false; status: number; error: string }
> {
  const tenantId = clean(input.tenantId);
  const streamId = clean(input.streamId);
  let channelId = clean(input.channelId);

  if (!tenantId) {
    return { ok: false, status: 401, error: "Authentification playback invalide." };
  }

  if (streamId) {
    const { data: stream, error: streamError } = await admin
      .from("streams")
      .select("id, tenant_id, channel_id")
      .eq("tenant_id", tenantId)
      .eq("id", streamId)
      .maybeSingle();

    if (streamError) {
      console.error("Playback stream lookup error", {
        error: streamError.message,
        code: streamError.code,
        tenantId,
        streamId,
      });
      return { ok: false, status: 500, error: "Une erreur est survenue." };
    }

    if (!stream) {
      return { ok: false, status: 404, error: "Ressource introuvable." };
    }

    const streamChannelId = clean((stream as { channel_id?: string | null }).channel_id);
    if (!streamChannelId) {
      return { ok: false, status: 409, error: "Aucune chaine n'est associee a ce stream." };
    }

    if (channelId && channelId !== streamChannelId) {
      return { ok: false, status: 401, error: "Authentification playback invalide." };
    }

    channelId = streamChannelId;
  }

  if (!channelId) {
    return { ok: false, status: 400, error: "Donnee requise manquante." };
  }

  const { data: channel, error: channelError } = await admin
    .from("channels")
    .select("id, tenant_id, origin_hls_url, active, is_active")
    .eq("tenant_id", tenantId)
    .eq("id", channelId)
    .maybeSingle();

  if (channelError) {
    console.error("Playback channel lookup error", {
      error: channelError.message,
      code: channelError.code,
      tenantId,
      channelId,
    });
    return { ok: false, status: 500, error: "Une erreur est survenue." };
  }

  if (!channel) {
    return { ok: false, status: 404, error: "Ressource introuvable." };
  }

  const originHlsUrl = clean((channel as { origin_hls_url?: string | null }).origin_hls_url);
  if (!isChannelActive(channel as { active?: boolean | null; is_active?: boolean | null })) {
    return { ok: false, status: 403, error: "Cette chaine est inactive." };
  }
  if (!originHlsUrl) {
    return { ok: false, status: 409, error: "Origine live indisponible." };
  }

  return {
    ok: true,
    value: {
      tenantId,
      channelId,
      originHlsUrl,
      streamId: streamId ?? null,
    },
  };
}
