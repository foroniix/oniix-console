import { NextResponse } from "next/server";

import { requireAuth } from "../../../_utils/auth";
import {
  CATALOG_EPISODE_SELECT,
  CATALOG_MEDIA_ASSET_SELECT,
  CATALOG_PLAYBACK_SOURCE_SELECT,
  CATALOG_PUBLICATION_SELECT,
  CATALOG_SEASON_SELECT,
  CATALOG_TITLE_SELECT,
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogEpisodeRow,
  normalizeCatalogMediaAssetRow,
  normalizeCatalogPlaybackSourceRow,
  normalizeCatalogPublicationRow,
  normalizeCatalogSeasonRow,
  normalizeCatalogTitleRow,
} from "../../../_utils/catalog";
import { supabaseAdmin, supabaseUser } from "../../../_utils/supabase";
import { isPublicationActive, pickPreferredAsset, resolvePublicMediaUrl } from "../../_utils";

type WatchProgressRow = {
  tenant_id: string;
  user_id: string;
  playable_type: "movie" | "episode" | "replay";
  playable_id: string;
  progress_sec: number;
  duration_sec: number | null;
  completed: boolean;
  updated_at: string;
};

type WatchlistRow = {
  tenant_id: string;
  user_id: string;
  playable_type: "movie" | "series" | "episode";
  playable_id: string;
  created_at: string;
};

type ReplayRow = {
  id: string;
  tenant_id: string;
  title: string | null;
  poster: string | null;
  hls_url: string | null;
  duration_sec: number | null;
  available_from: string | null;
  available_to: string | null;
  replay_status: string | null;
  channel_id: string | null;
};

type ChannelRow = {
  id: string;
  name: string;
  logo: string | null;
};

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value ?? "").trim())
        .filter((value): value is string => value.length > 0)
    )
  );
}

function progressKey(playableType: string, playableId: string) {
  return `${playableType}:${playableId}`;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const sb = supabaseUser(ctx.accessToken);
    const admin = supabaseAdmin();

    const [progressResult, watchlistResult] = await Promise.all([
      sb
        .from("watch_progress")
        .select("tenant_id,user_id,playable_type,playable_id,progress_sec,duration_sec,completed,updated_at")
        .eq("user_id", ctx.userId)
        .in("playable_type", ["movie", "episode", "replay"])
        .gt("progress_sec", 0)
        .order("updated_at", { ascending: false })
        .limit(100),
      sb
        .from("watchlist_items")
        .select("tenant_id,user_id,playable_type,playable_id,created_at")
        .eq("user_id", ctx.userId)
        .in("playable_type", ["movie", "series", "episode"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (progressResult.error) {
      if (isCatalogDomainMissing(progressResult.error)) return catalogDomainUnavailableResponse();
      if (isCatalogPolicyMissing(progressResult.error)) return catalogPolicyUnavailableResponse();
      console.error("Web library progress load error", {
        error: progressResult.error.message,
        userId: ctx.userId,
      });
      return NextResponse.json(
        { ok: false, error: "Impossible de charger votre progression." },
        { status: 400 }
      );
    }

    if (watchlistResult.error) {
      if (isCatalogDomainMissing(watchlistResult.error)) return catalogDomainUnavailableResponse();
      if (isCatalogPolicyMissing(watchlistResult.error)) return catalogPolicyUnavailableResponse();
      console.error("Web library watchlist load error", {
        error: watchlistResult.error.message,
        userId: ctx.userId,
      });
      return NextResponse.json(
        { ok: false, error: "Impossible de charger votre liste." },
        { status: 400 }
      );
    }

    const progressRows = (progressResult.data ?? []) as WatchProgressRow[];
    const watchlistRows = (watchlistResult.data ?? []) as WatchlistRow[];

    const movieIds = uniqueIds([
      ...progressRows.filter((row) => row.playable_type === "movie").map((row) => row.playable_id),
      ...watchlistRows.filter((row) => row.playable_type === "movie").map((row) => row.playable_id),
    ]);

    const seriesIds = uniqueIds(
      watchlistRows.filter((row) => row.playable_type === "series").map((row) => row.playable_id)
    );

    const episodeIds = uniqueIds([
      ...progressRows.filter((row) => row.playable_type === "episode").map((row) => row.playable_id),
      ...watchlistRows.filter((row) => row.playable_type === "episode").map((row) => row.playable_id),
    ]);

    const replayIds = uniqueIds(
      progressRows.filter((row) => row.playable_type === "replay").map((row) => row.playable_id)
    );

    let episodeRows = [] as ReturnType<typeof normalizeCatalogEpisodeRow>[];
    if (episodeIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_episodes")
        .select(CATALOG_EPISODE_SELECT)
        .in("id", episodeIds)
        .in("editorial_status", ["ready", "published"]);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library episode load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      episodeRows = (data ?? []).map((row) => normalizeCatalogEpisodeRow(row as Record<string, unknown>));
    }

    const derivedSeriesIds = uniqueIds(episodeRows.map((row) => row.series_id));
    const titleIds = uniqueIds([...movieIds, ...seriesIds, ...derivedSeriesIds]);

    let titleRows = [] as ReturnType<typeof normalizeCatalogTitleRow>[];
    if (titleIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_titles")
        .select(CATALOG_TITLE_SELECT)
        .in("id", titleIds)
        .in("editorial_status", ["ready", "published"]);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library title load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      titleRows = (data ?? []).map((row) => normalizeCatalogTitleRow(row as Record<string, unknown>));
    }

    const titleMap = new Map(titleRows.map((row) => [row.id, row]));
    const seasonIds = uniqueIds(episodeRows.map((row) => row.season_id));

    let seasonRows = [] as ReturnType<typeof normalizeCatalogSeasonRow>[];
    if (seasonIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_seasons")
        .select(CATALOG_SEASON_SELECT)
        .in("id", seasonIds);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library season load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      seasonRows = (data ?? []).map((row) => normalizeCatalogSeasonRow(row as Record<string, unknown>));
    }

    const seasonMap = new Map(seasonRows.map((row) => [row.id, row]));

    let replayRows = [] as ReplayRow[];
    if (replayIds.length > 0) {
      const { data, error } = await admin
        .from("replays")
        .select("id,tenant_id,title,poster,hls_url,duration_sec,available_from,available_to,replay_status,channel_id")
        .in("id", replayIds);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library replay load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      replayRows = (data ?? []) as ReplayRow[];
    }

    const replayChannelIds = uniqueIds(replayRows.map((row) => row.channel_id));
    let replayChannelRows = [] as ChannelRow[];
    if (replayChannelIds.length > 0) {
      const { data, error } = await admin
        .from("channels")
        .select("id,name,logo")
        .in("id", replayChannelIds);

      if (error) {
        console.error("Web library replay channels load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      replayChannelRows = (data ?? []) as ChannelRow[];
    }

    const replayChannelMap = new Map(replayChannelRows.map((row) => [row.id, row]));
    const replayMap = new Map(replayRows.map((row) => [row.id, row]));

    let publicationRows = [] as ReturnType<typeof normalizeCatalogPublicationRow>[];
    if (titleIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_publications")
        .select(CATALOG_PUBLICATION_SELECT)
        .in("playable_type", ["movie", "series"])
        .in("playable_id", titleIds)
        .eq("visibility", "public")
        .eq("publication_status", "published")
        .limit(500);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library publication load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      publicationRows = (data ?? []).map((row) =>
        normalizeCatalogPublicationRow(row as Record<string, unknown>)
      );
    }

    const now = new Date();
    const visibleMovieIds = new Set(
      publicationRows
        .filter((row) => row.playable_type === "movie" && isPublicationActive(row, now))
        .map((row) => row.playable_id)
    );
    const visibleSeriesIds = new Set(
      publicationRows
        .filter((row) => row.playable_type === "series" && isPublicationActive(row, now))
        .map((row) => row.playable_id)
    );

    let titleAssets = [] as ReturnType<typeof normalizeCatalogMediaAssetRow>[];
    if (titleIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_media_assets")
        .select(CATALOG_MEDIA_ASSET_SELECT)
        .eq("owner_type", "title")
        .in("owner_id", titleIds)
        .order("sort_order", { ascending: true })
        .limit(2000);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library title assets load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      titleAssets = (data ?? []).map((row) => normalizeCatalogMediaAssetRow(row as Record<string, unknown>));
    }

    const titleVisuals = new Map(
      titleIds.map((titleId) => [
        titleId,
        {
          poster_url: resolvePublicMediaUrl(pickPreferredAsset(titleAssets, titleId, "poster")?.source_url),
          backdrop_url: resolvePublicMediaUrl(pickPreferredAsset(titleAssets, titleId, "backdrop")?.source_url),
        },
      ])
    );

    let movieSources = [] as ReturnType<typeof normalizeCatalogPlaybackSourceRow>[];
    if (movieIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_playback_sources")
        .select(CATALOG_PLAYBACK_SOURCE_SELECT)
        .eq("playable_type", "movie")
        .in("playable_id", movieIds)
        .in("source_status", ["ready", "published"]);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library movie sources load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      movieSources = (data ?? []).map((row) =>
        normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>)
      );
    }

    let episodeSources = [] as ReturnType<typeof normalizeCatalogPlaybackSourceRow>[];
    if (episodeIds.length > 0) {
      const { data, error } = await admin
        .from("catalog_playback_sources")
        .select(CATALOG_PLAYBACK_SOURCE_SELECT)
        .eq("playable_type", "episode")
        .in("playable_id", episodeIds)
        .in("source_status", ["ready", "published"]);

      if (error) {
        if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
        console.error("Web library episode sources load error", { error: error.message, userId: ctx.userId });
        return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
      }

      episodeSources = (data ?? []).map((row) =>
        normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>)
      );
    }

    const moviePlayableIds = new Set(movieSources.map((row) => row.playable_id));
    const episodePlayableIds = new Set(episodeSources.map((row) => row.playable_id));
    const seriesPlayableIds = new Set(
      episodeRows.filter((row) => episodePlayableIds.has(row.id)).map((row) => row.series_id)
    );
    const episodeMap = new Map(episodeRows.map((row) => [row.id, row]));

    const continueWatching = progressRows
      .filter((row) => !row.completed && row.progress_sec > 0)
      .map((row) => {
        if (row.playable_type === "movie") {
          const title = titleMap.get(row.playable_id);
          if (!title || !visibleMovieIds.has(title.id) || !moviePlayableIds.has(title.id)) return null;
          const visuals = titleVisuals.get(title.id);
          const durationSec = row.duration_sec ?? movieSources.find((source) => source.playable_id === title.id)?.duration_sec ?? null;
          const percentComplete =
            durationSec && durationSec > 0 ? Math.min(99, Math.max(1, Math.round((row.progress_sec / durationSec) * 100))) : null;
          return {
            playable_type: "movie",
            playable_id: title.id,
            title_id: title.id,
            title_type: title.title_type,
            tenant_id: title.tenant_id,
            title: title.title,
            parent_title: null,
            poster_url: visuals?.poster_url ?? null,
            backdrop_url: visuals?.backdrop_url ?? null,
            progress_sec: row.progress_sec,
            duration_sec: durationSec,
            completed: row.completed,
            percent_complete: percentComplete,
            season_number: null,
            episode_number: null,
            updated_at: row.updated_at,
          };
        }

        const episode = episodeMap.get(row.playable_id);
        if (!episode || !episodePlayableIds.has(episode.id)) return null;
        const series = titleMap.get(episode.series_id);
        if (!series || !visibleSeriesIds.has(series.id)) return null;
        const visuals = titleVisuals.get(series.id);
        const season = episode.season_id ? seasonMap.get(episode.season_id) : null;
        const durationSec = row.duration_sec ?? episode.duration_sec ?? null;
        const percentComplete =
          durationSec && durationSec > 0 ? Math.min(99, Math.max(1, Math.round((row.progress_sec / durationSec) * 100))) : null;
        return {
          playable_type: "episode",
          playable_id: episode.id,
          title_id: series.id,
          title_type: series.title_type,
          tenant_id: series.tenant_id,
          title: episode.title,
          parent_title: series.title,
          poster_url: visuals?.poster_url ?? null,
          backdrop_url: visuals?.backdrop_url ?? null,
          progress_sec: row.progress_sec,
          duration_sec: durationSec,
          completed: row.completed,
          percent_complete: percentComplete,
          season_number: season?.season_number ?? null,
          episode_number: episode.episode_number,
          updated_at: row.updated_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 12);

    const replayContinueWatching = progressRows
      .filter((row) => row.playable_type === "replay" && !row.completed && row.progress_sec > 0)
      .map((row) => {
        const replay = replayMap.get(row.playable_id);
        if (!replay || String(replay.replay_status ?? "").toLowerCase() !== "published" || !replay.hls_url) return null;

        const nowMs = Date.now();
        const fromMs = replay.available_from ? Date.parse(replay.available_from) : null;
        const toMs = replay.available_to ? Date.parse(replay.available_to) : null;
        if (fromMs !== null && Number.isFinite(fromMs) && fromMs > nowMs) return null;
        if (toMs !== null && Number.isFinite(toMs) && toMs <= nowMs) return null;

        const channel = replay.channel_id ? replayChannelMap.get(replay.channel_id) : null;
        const durationSec = row.duration_sec ?? replay.duration_sec ?? null;
        const percentComplete =
          durationSec && durationSec > 0
            ? Math.min(99, Math.max(1, Math.round((row.progress_sec / durationSec) * 100)))
            : null;

        return {
          playable_type: "replay" as const,
          playable_id: replay.id,
          tenant_id: replay.tenant_id,
          title: replay.title?.trim() || "Replay",
          poster_url: replay.poster ?? null,
          channel_name: channel?.name ?? null,
          channel_logo: channel?.logo ?? null,
          progress_sec: row.progress_sec,
          duration_sec: durationSec,
          completed: row.completed,
          percent_complete: percentComplete,
          updated_at: row.updated_at,
          href: `/we/replays/${replay.id}`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
      .slice(0, 12);

    const progressMap = new Map(
      continueWatching.map((item) => [progressKey(item.playable_type, item.playable_id), item])
    );

    const watchlist = watchlistRows
      .map((row) => {
        if (row.playable_type === "movie") {
          const title = titleMap.get(row.playable_id);
          if (!title || !visibleMovieIds.has(title.id)) return null;
          const visuals = titleVisuals.get(title.id);
          return {
            playable_type: "movie",
            playable_id: title.id,
            title_id: title.id,
            title_type: title.title_type,
            tenant_id: title.tenant_id,
            title: title.title,
            parent_title: null,
            poster_url: visuals?.poster_url ?? null,
            backdrop_url: visuals?.backdrop_url ?? null,
            has_playback: moviePlayableIds.has(title.id),
            progress_sec: progressMap.get(progressKey("movie", title.id))?.progress_sec ?? null,
            duration_sec: progressMap.get(progressKey("movie", title.id))?.duration_sec ?? null,
            percent_complete: progressMap.get(progressKey("movie", title.id))?.percent_complete ?? null,
            season_number: null,
            episode_number: null,
            created_at: row.created_at,
          };
        }

        if (row.playable_type === "series") {
          const title = titleMap.get(row.playable_id);
          if (!title || !visibleSeriesIds.has(title.id)) return null;
          const visuals = titleVisuals.get(title.id);
          return {
            playable_type: "series",
            playable_id: title.id,
            title_id: title.id,
            title_type: title.title_type,
            tenant_id: title.tenant_id,
            title: title.title,
            parent_title: null,
            poster_url: visuals?.poster_url ?? null,
            backdrop_url: visuals?.backdrop_url ?? null,
            has_playback: seriesPlayableIds.has(title.id),
            progress_sec: null,
            duration_sec: null,
            percent_complete: null,
            season_number: null,
            episode_number: null,
            created_at: row.created_at,
          };
        }

        const episode = episodeMap.get(row.playable_id);
        if (!episode) return null;
        const series = titleMap.get(episode.series_id);
        if (!series || !visibleSeriesIds.has(series.id)) return null;
        const visuals = titleVisuals.get(series.id);
        const season = episode.season_id ? seasonMap.get(episode.season_id) : null;
        const progress = progressMap.get(progressKey("episode", episode.id)) ?? null;
        return {
          playable_type: "episode",
          playable_id: episode.id,
          title_id: series.id,
          title_type: series.title_type,
          tenant_id: series.tenant_id,
          title: episode.title,
          parent_title: series.title,
          poster_url: visuals?.poster_url ?? null,
          backdrop_url: visuals?.backdrop_url ?? null,
          has_playback: episodePlayableIds.has(episode.id),
          progress_sec: progress?.progress_sec ?? null,
          duration_sec: progress?.duration_sec ?? episode.duration_sec ?? null,
          percent_complete: progress?.percent_complete ?? null,
          season_number: season?.season_number ?? null,
          episode_number: episode.episode_number,
          created_at: row.created_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, 24);

    return NextResponse.json(
      {
        ok: true,
        continue_watching: continueWatching,
        replay_continue_watching: replayContinueWatching,
        watchlist,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Web library route error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
