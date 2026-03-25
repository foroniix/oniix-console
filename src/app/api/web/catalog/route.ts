import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../_utils/supabase";
import {
  CATALOG_EPISODE_SELECT,
  CATALOG_MEDIA_ASSET_SELECT,
  CATALOG_PLAYBACK_SOURCE_SELECT,
  CATALOG_PUBLICATION_SELECT,
  CATALOG_TITLE_SELECT,
  normalizeCatalogEpisodeRow,
  normalizeCatalogMediaAssetRow,
  normalizeCatalogPlaybackSourceRow,
  normalizeCatalogPublicationRow,
  normalizeCatalogTitleRow,
} from "../../_utils/catalog";
import { isPublicationActive, pickPreferredAsset, resolvePublicMediaUrl } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value ?? "").trim())
        .filter((value): value is string => value.length > 0)
    )
  );
}

export async function GET() {
  const admin = supabaseAdmin();
  const now = new Date();

  const { data: publicationRows, error: publicationError } = await admin
    .from("catalog_publications")
    .select(CATALOG_PUBLICATION_SELECT)
    .in("playable_type", ["movie", "series"])
    .eq("visibility", "public")
    .eq("publication_status", "published")
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (publicationError) {
    console.error("Web catalog publications load error", { error: publicationError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const activePublications = (publicationRows ?? [])
    .map((row) => normalizeCatalogPublicationRow(row as Record<string, unknown>))
    .filter((publication) => isPublicationActive(publication, now));

  const titleIds = uniqueIds(activePublications.map((publication) => publication.playable_id));
  if (titleIds.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const { data: titleRows, error: titleError } = await admin
    .from("catalog_titles")
    .select(CATALOG_TITLE_SELECT)
    .in("id", titleIds)
    .in("editorial_status", ["ready", "published"]);

  if (titleError) {
    console.error("Web catalog titles load error", { error: titleError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const titles = (titleRows ?? []).map((row) => normalizeCatalogTitleRow(row as Record<string, unknown>));
  const titleMap = new Map(titles.map((title) => [title.id, title]));
  const visibleTitleIds = titles.map((title) => title.id);

  const { data: assetRows, error: assetError } = await admin
    .from("catalog_media_assets")
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .eq("owner_type", "title")
    .in("owner_id", visibleTitleIds)
    .order("sort_order", { ascending: true })
    .limit(5000);

  if (assetError) {
    console.error("Web catalog assets load error", { error: assetError.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const assets = (assetRows ?? []).map((row) => normalizeCatalogMediaAssetRow(row as Record<string, unknown>));

  const movieIds = titles.filter((title) => title.title_type === "movie").map((title) => title.id);
  const seriesIds = titles.filter((title) => title.title_type === "series").map((title) => title.id);

  let movieSourceRows: ReturnType<typeof normalizeCatalogPlaybackSourceRow>[] = [];
  if (movieIds.length > 0) {
    const { data, error } = await admin
      .from("catalog_playback_sources")
      .select(CATALOG_PLAYBACK_SOURCE_SELECT)
      .eq("playable_type", "movie")
      .in("playable_id", movieIds)
      .in("source_status", ["ready", "published"]);

    if (error) {
      console.error("Web catalog movie sources load error", { error: error.message });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    movieSourceRows = (data ?? []).map((row) => normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>));
  }

  const episodesBySeries = new Map<string, string[]>();
  if (seriesIds.length > 0) {
    const { data, error } = await admin
      .from("catalog_episodes")
      .select(CATALOG_EPISODE_SELECT)
      .in("series_id", seriesIds)
      .in("editorial_status", ["ready", "published"])
      .order("sort_order", { ascending: true })
      .order("episode_number", { ascending: true });

    if (error) {
      console.error("Web catalog episodes load error", { error: error.message });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    for (const episode of (data ?? []).map((row) => normalizeCatalogEpisodeRow(row as Record<string, unknown>))) {
      const items = episodesBySeries.get(episode.series_id) ?? [];
      items.push(episode.id);
      episodesBySeries.set(episode.series_id, items);
    }
  }

  const episodeIds = uniqueIds(Array.from(episodesBySeries.values()).flat());
  let episodeSourceRows: ReturnType<typeof normalizeCatalogPlaybackSourceRow>[] = [];
  if (episodeIds.length > 0) {
    const { data, error } = await admin
      .from("catalog_playback_sources")
      .select(CATALOG_PLAYBACK_SOURCE_SELECT)
      .eq("playable_type", "episode")
      .in("playable_id", episodeIds)
      .in("source_status", ["ready", "published"]);

    if (error) {
      console.error("Web catalog episode sources load error", { error: error.message });
      return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
    }

    episodeSourceRows = (data ?? []).map((row) => normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>));
  }

  const moviePlayableIds = new Set(movieSourceRows.map((source) => source.playable_id));
  const seriesPlayableIds = new Set(
    Array.from(episodesBySeries.entries())
      .filter(([, ids]) => ids.some((episodeId) => episodeSourceRows.some((source) => source.playable_id === episodeId)))
      .map(([seriesId]) => seriesId)
  );

  const items = activePublications
    .map((publication) => {
      const title = titleMap.get(publication.playable_id);
      if (!title) return null;

      const poster = pickPreferredAsset(assets, title.id, "poster");
      const backdrop = pickPreferredAsset(assets, title.id, "backdrop");
      const logo = pickPreferredAsset(assets, title.id, "logo");
      const episodeIdsForSeries = episodesBySeries.get(title.id) ?? [];
      const hasPlayback =
        title.title_type === "movie"
          ? moviePlayableIds.has(title.id)
          : seriesPlayableIds.has(title.id);

      return {
        id: title.id,
        tenant_id: title.tenant_id,
        title_type: title.title_type,
        slug: title.slug,
        title: title.title,
        original_title: title.original_title,
        short_synopsis: title.short_synopsis,
        long_synopsis: title.long_synopsis,
        release_year: title.release_year,
        maturity_rating: title.maturity_rating,
        original_language: title.original_language,
        editorial_status: title.editorial_status,
        episode_count: episodeIdsForSeries.length,
        has_playback: hasPlayback,
        storefront: publication.storefront,
        featured_rank: publication.featured_rank,
        poster_url: resolvePublicMediaUrl(poster?.source_url),
        backdrop_url: resolvePublicMediaUrl(backdrop?.source_url),
        logo_url: resolvePublicMediaUrl(logo?.source_url),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const leftFeatured = left.featured_rank ?? Number.MAX_SAFE_INTEGER;
      const rightFeatured = right.featured_rank ?? Number.MAX_SAFE_INTEGER;
      if (leftFeatured !== rightFeatured) return leftFeatured - rightFeatured;
      return left.title.localeCompare(right.title, "fr");
    });

  return NextResponse.json({ ok: true, items });
}
