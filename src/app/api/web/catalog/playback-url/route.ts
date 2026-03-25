import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "../../../_utils/supabase";
import {
  CATALOG_PLAYBACK_SOURCE_SELECT,
  CATALOG_PUBLICATION_SELECT,
  normalizeCatalogPlaybackSourceRow,
  normalizeCatalogPublicationRow,
} from "../../../_utils/catalog";
import {
  isPublicationActive,
  parseStorageReference,
  pickPreferredPlaybackSource,
  resolvePlaybackOriginUrl,
} from "../../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_SCHEMA = z.object({
  playable_type: z.enum(["movie", "episode"]),
  playable_id: z.string().uuid(),
});

export async function POST(req: Request) {
  const parsed = await req.json().catch(() => null);
  const body = REQUEST_SCHEMA.safeParse(parsed);
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Données invalides." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const now = new Date();
  const { playable_type: playableType, playable_id: playableId } = body.data;

  if (playableType === "movie") {
    const { data: publicationRows, error: publicationError } = await admin
      .from("catalog_publications")
      .select(CATALOG_PUBLICATION_SELECT)
      .eq("playable_type", "movie")
      .eq("playable_id", playableId)
      .eq("visibility", "public")
      .eq("publication_status", "published")
      .limit(10);

    if (publicationError) {
      console.error("Web catalog movie publication check error", {
        error: publicationError.message,
        playableId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    const isPublic = (publicationRows ?? [])
      .map((row) => normalizeCatalogPublicationRow(row as Record<string, unknown>))
      .some((publication) => isPublicationActive(publication, now));

    if (!isPublic) {
      return NextResponse.json({ ok: false, error: "Ce contenu n'est pas disponible." }, { status: 404 });
    }
  } else {
    const { data: episodeRow, error: episodeError } = await admin
      .from("catalog_episodes")
      .select("id,series_id")
      .eq("id", playableId)
      .maybeSingle();

    if (episodeError) {
      console.error("Web catalog episode lookup error", {
        error: episodeError.message,
        playableId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    if (!episodeRow) {
      return NextResponse.json({ ok: false, error: "Épisode introuvable." }, { status: 404 });
    }

    const { data: publicationRows, error: publicationError } = await admin
      .from("catalog_publications")
      .select(CATALOG_PUBLICATION_SELECT)
      .eq("playable_type", "series")
      .eq("playable_id", String((episodeRow as { series_id?: string | null }).series_id ?? ""))
      .eq("visibility", "public")
      .eq("publication_status", "published")
      .limit(10);

    if (publicationError) {
      console.error("Web catalog series publication check error", {
        error: publicationError.message,
        playableId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    const isPublic = (publicationRows ?? [])
      .map((row) => normalizeCatalogPublicationRow(row as Record<string, unknown>))
      .some((publication) => isPublicationActive(publication, now));

    if (!isPublic) {
      return NextResponse.json({ ok: false, error: "Ce contenu n'est pas disponible." }, { status: 404 });
    }
  }

  const { data: sourceRows, error: sourceError } = await admin
    .from("catalog_playback_sources")
    .select(CATALOG_PLAYBACK_SOURCE_SELECT)
    .eq("playable_type", playableType)
    .eq("playable_id", playableId)
    .in("source_status", ["ready", "published"])
    .limit(20);

  if (sourceError) {
    console.error("Web catalog playback sources error", {
      error: sourceError.message,
      playableType,
      playableId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const source = pickPreferredPlaybackSource(
    (sourceRows ?? []).map((row) => normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>))
  );

  if (!source) {
    return NextResponse.json({ ok: false, error: "Aucune source de lecture disponible." }, { status: 404 });
  }

  const storageRef = parseStorageReference(source.origin_url);
  if (storageRef && source.source_kind !== "file") {
    return NextResponse.json(
      {
        ok: false,
        error: "Cette source privée n'est pas encore compatible avec la lecture web.",
      },
      { status: 409 }
    );
  }

  if (source.source_kind === "dash") {
    return NextResponse.json(
      {
        ok: false,
        error: "La lecture MPEG-DASH n'est pas encore activée côté web.",
      },
      { status: 409 }
    );
  }

  const playbackUrl = await resolvePlaybackOriginUrl(admin, source.origin_url, 3600);
  if (!playbackUrl.ok) {
    return NextResponse.json({ ok: false, error: playbackUrl.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    playable_type: playableType,
    playable_id: playableId,
    source_kind: source.source_kind,
    playback_url: playbackUrl.url,
    duration_sec: source.duration_sec,
  });
}
