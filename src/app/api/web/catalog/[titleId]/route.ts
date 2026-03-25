import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../_utils/supabase";
import {
  CATALOG_EPISODE_SELECT,
  CATALOG_MEDIA_ASSET_SELECT,
  CATALOG_PLAYBACK_SOURCE_SELECT,
  CATALOG_PUBLICATION_SELECT,
  CATALOG_SEASON_SELECT,
  CATALOG_TITLE_SELECT,
  normalizeCatalogEpisodeRow,
  normalizeCatalogMediaAssetRow,
  normalizeCatalogPlaybackSourceRow,
  normalizeCatalogPublicationRow,
  normalizeCatalogSeasonRow,
  normalizeCatalogTitleRow,
} from "../../../_utils/catalog";
import {
  isPublicationActive,
  isUsablePlaybackSource,
  pickPreferredAsset,
  resolvePublicMediaUrl,
} from "../../_utils";

type Params = { params: Promise<{ titleId: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_: Request, { params }: Params) {
  const { titleId } = await params;
  const admin = supabaseAdmin();
  const now = new Date();

  const { data: titleRow, error: titleError } = await admin
    .from("catalog_titles")
    .select(CATALOG_TITLE_SELECT)
    .eq("id", titleId)
    .in("editorial_status", ["ready", "published"])
    .maybeSingle();

  if (titleError) {
    console.error("Web catalog title detail error", { error: titleError.message, titleId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!titleRow) {
    return NextResponse.json({ ok: false, error: "Titre introuvable." }, { status: 404 });
  }

  const title = normalizeCatalogTitleRow(titleRow as Record<string, unknown>);

  const { data: publicationRows, error: publicationError } = await admin
    .from("catalog_publications")
    .select(CATALOG_PUBLICATION_SELECT)
    .eq("playable_type", title.title_type)
    .eq("playable_id", title.id)
    .eq("visibility", "public")
    .eq("publication_status", "published")
    .limit(20);

  if (publicationError) {
    console.error("Web catalog title publications error", {
      error: publicationError.message,
      titleId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const activePublications = (publicationRows ?? [])
    .map((row) => normalizeCatalogPublicationRow(row as Record<string, unknown>))
    .filter((publication) => isPublicationActive(publication, now));

  if (activePublications.length === 0) {
    return NextResponse.json({ ok: false, error: "Titre non disponible." }, { status: 404 });
  }

  const { data: titleAssetRows, error: titleAssetError } = await admin
    .from("catalog_media_assets")
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .eq("owner_type", "title")
    .eq("owner_id", title.id)
    .order("sort_order", { ascending: true })
    .limit(200);

  if (titleAssetError) {
    console.error("Web catalog title assets error", { error: titleAssetError.message, titleId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const titleAssets = (titleAssetRows ?? []).map((row) => normalizeCatalogMediaAssetRow(row as Record<string, unknown>));
  const poster = pickPreferredAsset(titleAssets, title.id, "poster");
  const backdrop = pickPreferredAsset(titleAssets, title.id, "backdrop");
  const logo = pickPreferredAsset(titleAssets, title.id, "logo");

  if (title.title_type === "movie") {
    const { data: sourceRows, error: sourceError } = await admin
      .from("catalog_playback_sources")
      .select(CATALOG_PLAYBACK_SOURCE_SELECT)
      .eq("playable_type", "movie")
      .eq("playable_id", title.id)
      .in("source_status", ["ready", "published"])
      .order("updated_at", { ascending: false })
      .limit(20);

    if (sourceError) {
      console.error("Web catalog movie sources error", { error: sourceError.message, titleId });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    const sources = (sourceRows ?? []).map((row) => normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>));

    return NextResponse.json({
      ok: true,
      title: {
        ...title,
        poster_url: resolvePublicMediaUrl(poster?.source_url),
        backdrop_url: resolvePublicMediaUrl(backdrop?.source_url),
        logo_url: resolvePublicMediaUrl(logo?.source_url),
      },
      publication: activePublications[0],
      movie_source: sources.find(isUsablePlaybackSource) ?? null,
      seasons: [],
      episodes: [],
    });
  }

  const { data: seasonRows, error: seasonError } = await admin
    .from("catalog_seasons")
    .select(CATALOG_SEASON_SELECT)
    .eq("series_id", title.id)
    .in("editorial_status", ["ready", "published"])
    .order("sort_order", { ascending: true })
    .order("season_number", { ascending: true });

  if (seasonError) {
    console.error("Web catalog seasons error", { error: seasonError.message, titleId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const seasons = (seasonRows ?? []).map((row) => normalizeCatalogSeasonRow(row as Record<string, unknown>));

  const { data: episodeRows, error: episodeError } = await admin
    .from("catalog_episodes")
    .select(CATALOG_EPISODE_SELECT)
    .eq("series_id", title.id)
    .in("editorial_status", ["ready", "published"])
    .order("sort_order", { ascending: true })
    .order("episode_number", { ascending: true });

  if (episodeError) {
    console.error("Web catalog episodes detail error", { error: episodeError.message, titleId });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const episodes = (episodeRows ?? []).map((row) => normalizeCatalogEpisodeRow(row as Record<string, unknown>));
  const episodeIds = episodes.map((episode) => episode.id);

  let episodeSources: ReturnType<typeof normalizeCatalogPlaybackSourceRow>[] = [];
  if (episodeIds.length > 0) {
    const { data: sourceRows, error: sourceError } = await admin
      .from("catalog_playback_sources")
      .select(CATALOG_PLAYBACK_SOURCE_SELECT)
      .eq("playable_type", "episode")
      .in("playable_id", episodeIds)
      .in("source_status", ["ready", "published"]);

    if (sourceError) {
      console.error("Web catalog episode sources detail error", {
        error: sourceError.message,
        titleId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    episodeSources = (sourceRows ?? []).map((row) => normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>));
  }

  let episodeAssets = [] as ReturnType<typeof normalizeCatalogMediaAssetRow>[];
  if (episodeIds.length > 0) {
    const { data: assetRows, error: assetError } = await admin
      .from("catalog_media_assets")
      .select(CATALOG_MEDIA_ASSET_SELECT)
      .eq("owner_type", "episode")
      .in("owner_id", episodeIds)
      .order("sort_order", { ascending: true })
      .limit(2000);

    if (assetError) {
      console.error("Web catalog episode assets detail error", {
        error: assetError.message,
        titleId,
      });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    episodeAssets = (assetRows ?? []).map((row) => normalizeCatalogMediaAssetRow(row as Record<string, unknown>));
  }

  const sourceMap = new Map(
    episodeSources.filter(isUsablePlaybackSource).map((source) => [source.playable_id, source])
  );

  return NextResponse.json({
    ok: true,
    title: {
      ...title,
      poster_url: resolvePublicMediaUrl(poster?.source_url),
      backdrop_url: resolvePublicMediaUrl(backdrop?.source_url),
      logo_url: resolvePublicMediaUrl(logo?.source_url),
    },
    publication: activePublications[0],
    movie_source: null,
    seasons,
    episodes: episodes.map((episode) => {
      const thumbnail = pickPreferredAsset(episodeAssets, episode.id, "thumbnail");
      const episodePoster = pickPreferredAsset(episodeAssets, episode.id, "poster");
      const source = sourceMap.get(episode.id) ?? null;
      return {
        ...episode,
        thumbnail_url: resolvePublicMediaUrl(thumbnail?.source_url),
        poster_url: resolvePublicMediaUrl(episodePoster?.source_url),
        has_playback: Boolean(source),
        source_kind: source?.source_kind ?? null,
      };
    }),
  });
}
