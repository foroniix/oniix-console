import { z } from "npm:zod@4";

import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { requireJobSecret } from "../_shared/auth.ts";
import { fetchWithRetry } from "../_shared/net.ts";
import { classifyPlaylist, pickFirstMediaPlaylistUrl, pickFirstSegmentUrl } from "../_shared/hls.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const requestSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

type HealthResult = {
  channel_id: string;
  tenant_id: string;
  status: "ok" | "degraded" | "down";
  last_check_at: string;
  master_playlist_http_code: number | null;
  media_playlist_http_code: number | null;
  segment_http_code: number | null;
  message: string | null;
};

async function probeChannel(originHlsUrl: string): Promise<Omit<HealthResult, "channel_id" | "tenant_id" | "last_check_at">> {
  let masterCode: number | null = null;
  let mediaCode: number | null = null;
  let segmentCode: number | null = null;

  try {
    const masterResponse = await fetchWithRetry(originHlsUrl, { headers: { "Cache-Control": "no-cache" } }, {
      timeoutMs: env.healthcheckTimeoutMs,
      retries: 1,
    });
    masterCode = masterResponse.status;

    if (!masterResponse.ok) {
      return {
        status: "down",
        master_playlist_http_code: masterCode,
        media_playlist_http_code: null,
        segment_http_code: null,
        message: `Master playlist returned ${masterCode}.`,
      };
    }

    const masterText = await masterResponse.text();
    const playlistType = classifyPlaylist(masterText);
    const mediaUrl =
      playlistType === "master" ? pickFirstMediaPlaylistUrl(masterText, originHlsUrl) : originHlsUrl;

    if (!mediaUrl) {
      return {
        status: "degraded",
        master_playlist_http_code: masterCode,
        media_playlist_http_code: null,
        segment_http_code: null,
        message: "Unable to resolve a media playlist from the master playlist.",
      };
    }

    const mediaResponse = await fetchWithRetry(mediaUrl, { headers: { "Cache-Control": "no-cache" } }, {
      timeoutMs: env.healthcheckTimeoutMs,
      retries: 1,
    });
    mediaCode = mediaResponse.status;
    if (!mediaResponse.ok) {
      return {
        status: "degraded",
        master_playlist_http_code: masterCode,
        media_playlist_http_code: mediaCode,
        segment_http_code: null,
        message: `Media playlist returned ${mediaCode}.`,
      };
    }

    const mediaText = await mediaResponse.text();
    const segmentUrl = pickFirstSegmentUrl(mediaText, mediaUrl);
    if (!segmentUrl) {
      return {
        status: "degraded",
        master_playlist_http_code: masterCode,
        media_playlist_http_code: mediaCode,
        segment_http_code: null,
        message: "No fetchable segment found in media playlist.",
      };
    }

    const segmentResponse = await fetchWithRetry(
      segmentUrl,
      {
        headers: {
          Range: "bytes=0-0",
          "Cache-Control": "no-cache",
        },
      },
      {
        timeoutMs: env.healthcheckTimeoutMs,
        retries: 1,
      }
    );
    segmentCode = segmentResponse.status;

    if (!segmentResponse.ok && segmentResponse.status !== 206) {
      return {
        status: "degraded",
        master_playlist_http_code: masterCode,
        media_playlist_http_code: mediaCode,
        segment_http_code: segmentCode,
        message: `Segment probe returned ${segmentCode}.`,
      };
    }

    return {
      status: "ok",
      master_playlist_http_code: masterCode,
      media_playlist_http_code: mediaCode,
      segment_http_code: segmentCode,
      message: "Master playlist, media playlist and first segment are reachable.",
    };
  } catch (error) {
    return {
      status: masterCode ? "degraded" : "down",
      master_playlist_http_code: masterCode,
      media_playlist_http_code: mediaCode,
      segment_http_code: segmentCode,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, { status: 405 });

  const secret = requireJobSecret(request);
  if (!secret.ok) return secret.res;

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json().catch(() => ({})));
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid healthcheck request.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }

  const limit = body.limit ?? 25;
  const admin = createAdminClient();
  let query = admin
    .from("channels")
    .select("id, tenant_id, name, origin_hls_url, is_active, active")
    .limit(limit)
    .order("updated_at", { ascending: false });

  if (body.tenant_id) query = query.eq("tenant_id", body.tenant_id);
  if (body.channel_id) query = query.eq("id", body.channel_id);

  const { data: channels, error: channelsError } = await query;
  if (channelsError) {
    console.error("check_channel_health channels lookup failed", channelsError);
    return jsonResponse({ ok: false, error: "Unable to load channels." }, { status: 500 });
  }

  const results: HealthResult[] = [];
  for (const channel of channels ?? []) {
    const isActive = Boolean((channel as Record<string, unknown>).is_active ?? (channel as Record<string, unknown>).active);
    const originHlsUrl = String((channel as Record<string, unknown>).origin_hls_url ?? "").trim();
    if (!isActive || !originHlsUrl) continue;

    const lastCheckAt = new Date().toISOString();
    const probe = await probeChannel(originHlsUrl);
    const result: HealthResult = {
      channel_id: String(channel.id),
      tenant_id: String(channel.tenant_id),
      last_check_at: lastCheckAt,
      ...probe,
    };
    results.push(result);

    const { error: upsertError } = await admin.from("channel_health").upsert(
      {
        channel_id: result.channel_id,
        tenant_id: result.tenant_id,
        last_check_at: result.last_check_at,
        status: result.status,
        master_playlist_http_code: result.master_playlist_http_code,
        media_playlist_http_code: result.media_playlist_http_code,
        segment_http_code: result.segment_http_code,
        message: result.message,
      },
      { onConflict: "channel_id" }
    );

    if (upsertError) {
      console.error("check_channel_health upsert failed", { channelId: result.channel_id, error: upsertError });
    }
  }

  return jsonResponse({
    ok: true,
    checked: results.length,
    results,
  });
});
