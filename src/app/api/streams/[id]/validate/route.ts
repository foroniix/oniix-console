import { NextResponse, type NextRequest } from "next/server";

import { requireAuth, requireTenant } from "../../../_utils/auth";
import { auditLog } from "../../../_utils/audit";
import { supabaseUser } from "../../../_utils/supabase";

type Params = { params: Promise<{ id: string }> };
type CheckStatus = "OK" | "WARN" | "FAIL";

type CheckResult = {
  key: string;
  label: string;
  status: CheckStatus;
  message: string;
};

function buildCheck(
  key: string,
  label: string,
  status: CheckStatus,
  message: string
): CheckResult {
  return { key, label, status, message };
}

function parseAttributes(input: string) {
  const out: Record<string, string> = {};
  const pairs = input.split(",");
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey?.trim().toUpperCase();
    if (!key || !rest.length) continue;
    out[key] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
  return out;
}

function resolveUrl(baseUrl: string, value: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function parseMasterPlaylist(manifest: string, baseUrl: string) {
  const lines = manifest.split(/\r?\n/);
  const variants: Array<{ url: string; bandwidth: number }> = [];
  const media: Array<{ type: string; language: string | null }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;

    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const attrs = parseAttributes(line.slice("#EXT-X-STREAM-INF:".length));
      const bandwidth = Number(attrs.BANDWIDTH ?? 0);
      const uri = lines[i + 1]?.trim() ?? "";
      if (uri && !uri.startsWith("#")) {
        variants.push({
          url: resolveUrl(baseUrl, uri),
          bandwidth: Number.isFinite(bandwidth) ? bandwidth : 0,
        });
      }
    }

    if (line.startsWith("#EXT-X-MEDIA:")) {
      const attrs = parseAttributes(line.slice("#EXT-X-MEDIA:".length));
      media.push({
        type: attrs.TYPE?.toUpperCase() ?? "",
        language: attrs.LANGUAGE ?? null,
      });
    }
  }

  return { variants, media };
}

function parseMediaPlaylist(manifest: string, baseUrl: string) {
  const lines = manifest.split(/\r?\n/);
  const durations: number[] = [];
  const segmentUrls: string[] = [];
  let targetDuration = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-TARGETDURATION:")) {
      const value = Number(line.replace("#EXT-X-TARGETDURATION:", ""));
      if (Number.isFinite(value)) targetDuration = value;
    } else if (line.startsWith("#EXTINF:")) {
      const value = Number(line.replace("#EXTINF:", "").split(",")[0] ?? 0);
      if (Number.isFinite(value)) durations.push(value);
    } else if (!line.startsWith("#")) {
      segmentUrls.push(resolveUrl(baseUrl, line));
    }
  }

  return { targetDuration, durations, segmentUrls };
}

async function probeUrl(url: string) {
  try {
    let res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-1" },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
    }
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function POST(_: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const supa = supabaseUser(ctx.accessToken);

  const { data: stream, error: streamError } = await supa
    .from("streams")
    .select("id,hls_url,captions")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .single();

  if (streamError || !stream) {
    if (streamError) {
      console.error("Stream validate lookup error", { error: streamError.message, tenantId: ctx.tenantId, id });
    }
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const hlsUrl = String(stream.hls_url ?? "").trim();
  if (!hlsUrl) {
    return NextResponse.json({ ok: false, error: "Manifest HLS manquant." }, { status: 400 });
  }

  const checks: CheckResult[] = [];
  let manifestText = "";
  let playlistUrl = hlsUrl;
  let variantsCount = 0;
  let audioTracks = 0;
  let subtitleTracks = 0;
  let segmentErrorCount = 0;

  try {
    const manifestRes = await fetch(hlsUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!manifestRes.ok) {
      checks.push(
        buildCheck(
          "manifest_access",
          "Manifest accessible",
          "FAIL",
          `HTTP ${manifestRes.status} sur le manifest.`
        )
      );
      const validatedAt = new Date().toISOString();
      await auditLog({
        sb: supa,
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        action: "STREAM_VALIDATE_HLS",
        targetType: "stream",
        targetId: id,
        metadata: {
          summary: "FAIL",
          validatedAt,
          checks: checks.map((check) => ({
            key: check.key,
            status: check.status,
          })),
          incidents: checks.filter((check) => check.status !== "OK").map((check) => check.message),
        },
      });
      return NextResponse.json(
        {
          ok: true,
          validatedAt,
          summary: "FAIL",
          checks,
          metrics: {
            variantsCount,
            audioTracks,
            subtitleTracks,
            segmentErrorCount,
          },
          incidents: checks.filter((check) => check.status === "FAIL").map((check) => check.message),
        },
        { status: 200 }
      );
    }

    manifestText = await manifestRes.text();
    const cors = manifestRes.headers.get("access-control-allow-origin");
    const tlsOk = hlsUrl.startsWith("https://");

    checks.push(buildCheck("manifest_access", "Manifest accessible", "OK", "Manifest reachable (HTTP 200)."));
    checks.push(
      buildCheck(
        "tls",
        "TLS",
        tlsOk ? "OK" : "FAIL",
        tlsOk ? "Flux servi en HTTPS." : "Le flux doit etre en HTTPS pour un usage production."
      )
    );
    checks.push(
      buildCheck(
        "cors",
        "CORS",
        cors ? "OK" : "WARN",
        cors ? `Header CORS detecte (${cors}).` : "Header CORS absent sur le manifest."
      )
    );

    const isMaster = manifestText.includes("#EXT-X-STREAM-INF");
    if (isMaster) {
      const parsedMaster = parseMasterPlaylist(manifestText, hlsUrl);
      variantsCount = parsedMaster.variants.length;
      audioTracks = parsedMaster.media.filter((item) => item.type === "AUDIO").length;
      subtitleTracks = parsedMaster.media.filter((item) => item.type === "SUBTITLES").length;

      const bitrates = parsedMaster.variants.map((variant) => variant.bandwidth).filter((value) => value > 0);
      const sorted = [...bitrates].sort((a, b) => a - b);
      const coherent = bitrates.every((value, index) => value === sorted[index]);

      checks.push(
        buildCheck(
          "variants",
          "Variants & bitrates",
          variantsCount > 0 ? (coherent ? "OK" : "WARN") : "FAIL",
          variantsCount > 0
            ? coherent
              ? `${variantsCount} variants detectees, bitrates coherents.`
              : `${variantsCount} variants detectees mais ordre de bitrate incoherent.`
            : "Aucune variante detectee dans le master playlist."
        )
      );
      checks.push(
        buildCheck(
          "audio_tracks",
          "Audio tracks",
          audioTracks > 0 ? "OK" : "WARN",
          audioTracks > 0 ? `${audioTracks} piste(s) audio detectee(s).` : "Aucune piste audio explicite detectee."
        )
      );

      const expectedSubtitles = Array.isArray(stream.captions) && stream.captions.length > 0;
      checks.push(
        buildCheck(
          "subtitle_tracks",
          "Subtitle tracks",
          expectedSubtitles ? (subtitleTracks > 0 ? "OK" : "WARN") : subtitleTracks > 0 ? "OK" : "WARN",
          expectedSubtitles
            ? subtitleTracks > 0
              ? `${subtitleTracks} piste(s) sous-titre detectee(s).`
              : "Sous-titres attendus mais non detectes dans le manifest."
            : subtitleTracks > 0
              ? `${subtitleTracks} piste(s) sous-titre detectee(s).`
              : "Aucune piste sous-titre detectee."
        )
      );

      if (parsedMaster.variants[0]?.url) {
        playlistUrl = parsedMaster.variants[0].url;
      }
    }

    const mediaRes1 = await fetch(playlistUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!mediaRes1.ok) {
      checks.push(
        buildCheck(
          "playlist_reload",
          "Reload playlist",
          "FAIL",
          `Impossible de charger la media playlist (${mediaRes1.status}).`
        )
      );
    } else {
      const playlistBody1 = await mediaRes1.text();
      await new Promise((resolve) => setTimeout(resolve, 1300));
      const mediaRes2 = await fetch(playlistUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const playlistBody2 = mediaRes2.ok ? await mediaRes2.text() : "";
      checks.push(
        buildCheck(
          "playlist_reload",
          "Reload playlist",
          mediaRes2.ok && playlistBody1 !== playlistBody2 ? "OK" : "WARN",
          mediaRes2.ok && playlistBody1 !== playlistBody2
            ? "Playlist mise a jour entre deux lectures."
            : "Playlist stable entre deux lectures (verifier si flux en direct)."
        )
      );

      const parsedMedia = parseMediaPlaylist(playlistBody1, playlistUrl);
      if (parsedMedia.targetDuration <= 0 || parsedMedia.durations.length === 0) {
        checks.push(
          buildCheck(
            "segment_drift",
            "Targetduration / segments",
            "WARN",
            "Informations de segments insuffisantes pour calculer le drift."
          )
        );
      } else {
        const maxDuration = Math.max(...parsedMedia.durations);
        const drift = maxDuration - parsedMedia.targetDuration;
        checks.push(
          buildCheck(
            "segment_drift",
            "Targetduration / segments",
            drift <= 0.5 ? "OK" : drift <= 1.5 ? "WARN" : "FAIL",
            `Target ${parsedMedia.targetDuration}s, segment max ${maxDuration.toFixed(2)}s (drift ${drift.toFixed(2)}s).`
          )
        );
      }

      const segmentCandidates = parsedMedia.segmentUrls.slice(0, 3);
      if (!segmentCandidates.length) {
        checks.push(
          buildCheck("segment_errors", "Erreurs segments", "WARN", "Aucun segment media detecte a verifier.")
        );
      } else {
        const probeResults = await Promise.all(segmentCandidates.map((url) => probeUrl(url)));
        segmentErrorCount = probeResults.filter((result) => !result.ok || result.status >= 400).length;
        checks.push(
          buildCheck(
            "segment_errors",
            "Erreurs segments",
            segmentErrorCount === 0 ? "OK" : segmentErrorCount <= 1 ? "WARN" : "FAIL",
            segmentErrorCount === 0
              ? "Aucune erreur 4xx/5xx detectee sur les segments testes."
              : `${segmentErrorCount} segment(s) en erreur sur ${segmentCandidates.length} test(s).`
          )
        );
      }
    }
  } catch (error) {
    console.error("Stream validate fatal error", {
      tenantId: ctx.tenantId,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    checks.push(
      buildCheck(
        "manifest_access",
        "Manifest accessible",
        "FAIL",
        "Validation interrompue: manifest inaccessible ou timeout."
      )
    );
  }

  const summary: CheckStatus = checks.some((check) => check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.status === "WARN")
      ? "WARN"
      : "OK";
  const validatedAt = new Date().toISOString();

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: "STREAM_VALIDATE_HLS",
    targetType: "stream",
    targetId: id,
    metadata: {
      summary,
      validatedAt,
      checks: checks.map((check) => ({
        key: check.key,
        status: check.status,
      })),
      incidents: checks
        .filter((check) => check.status === "FAIL" || check.status === "WARN")
        .map((check) => `${check.label}: ${check.message}`),
    },
  });

  return NextResponse.json(
    {
      ok: true,
      validatedAt,
      summary,
      checks,
      metrics: {
        manifestUrl: hlsUrl,
        variantsCount,
        audioTracks,
        subtitleTracks,
        segmentErrorCount,
      },
      incidents: checks
        .filter((check) => check.status === "FAIL" || check.status === "WARN")
        .map((check) => `${check.label}: ${check.message}`),
    },
    { status: 200 }
  );
}
