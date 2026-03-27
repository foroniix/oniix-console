"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Clapperboard,
  Edit3,
  Film,
  FolderKanban,
  Globe2,
  ImageIcon,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { DataTableShell } from "@/components/console/data-table-shell";
import { FilterBar } from "@/components/console/filter-bar";
import { KpiCard, KpiRow } from "@/components/console/kpi";
import { PageHeader } from "@/components/console/page-header";
import { PageShell } from "@/components/console/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type CatalogDeliveryMode,
  type CatalogEditorialStatus,
  type CatalogEpisode,
  type CatalogMediaAsset,
  type CatalogMediaAssetType,
  type CatalogPlaybackPlayableType,
  type CatalogPlaybackSource,
  type CatalogPlayableType,
  type CatalogPublication,
  type CatalogPublicationStatus,
  type CatalogSeason,
  type CatalogSourceKind,
  type CatalogSourceStatus,
  type CatalogTitle,
  type CatalogTitleType,
  type CatalogVisibility,
  formatCatalogDeliveryModeLabel,
  formatCatalogMediaAssetTypeLabel,
  formatCatalogPublicationStatusLabel,
  formatCatalogSourceKindLabel,
  formatCatalogStatusLabel,
  formatCatalogTitleTypeLabel,
  formatCatalogVisibilityLabel,
  CATALOG_MEDIA_UPLOAD_BUCKET,
  slugifyCatalogValue,
} from "@/lib/catalog";
import { supabase } from "@/lib/supabaseClient";

type CatalogTitlesResponse = { ok?: boolean; error?: string; titles?: CatalogTitle[] };
type CatalogTitleResponse = { ok?: boolean; error?: string; title?: CatalogTitle };
type CatalogSeasonsResponse = { ok?: boolean; error?: string; seasons?: CatalogSeason[] };
type CatalogSeasonResponse = { ok?: boolean; error?: string; season?: CatalogSeason };
type CatalogEpisodesResponse = { ok?: boolean; error?: string; episodes?: CatalogEpisode[] };
type CatalogEpisodeResponse = { ok?: boolean; error?: string; episode?: CatalogEpisode };
type CatalogPlaybackSourcesResponse = { ok?: boolean; error?: string; sources?: CatalogPlaybackSource[] };
type CatalogPlaybackSourceResponse = { ok?: boolean; error?: string; source?: CatalogPlaybackSource };
type CatalogMediaAssetsResponse = { ok?: boolean; error?: string; assets?: CatalogMediaAsset[] };
type CatalogMediaAssetResponse = { ok?: boolean; error?: string; asset?: CatalogMediaAsset };
type CatalogActionResponse = { ok?: boolean; error?: string };
type CatalogPlaybackUploadResponse = {
  ok?: boolean;
  error?: string;
  upload?: {
    bucket: string;
    path: string;
    token: string;
    content_type?: string | null;
    origin_url: string;
  };
};
type CatalogMediaUploadResponse = {
  ok?: boolean;
  error?: string;
  upload?: {
    bucket: string;
    path: string;
    token: string;
    content_type?: string | null;
    origin_url: string;
  };
};
type CatalogPublicationsResponse = { ok?: boolean; error?: string; publications?: CatalogPublication[] };
type CatalogPublicationResponse = { ok?: boolean; error?: string; publication?: CatalogPublication };

type TitleFormState = {
  title_type: CatalogTitleType;
  title: string;
  slug: string;
  original_title: string;
  release_year: string;
  original_language: string;
  country_of_origin: string;
  maturity_rating: string;
  short_synopsis: string;
  long_synopsis: string;
  editorial_status: CatalogEditorialStatus;
};

type SeasonFormState = {
  season_number: string;
  title: string;
  synopsis: string;
  editorial_status: CatalogEditorialStatus;
  sort_order: string;
};

type EpisodeFormState = {
  season_id: string;
  episode_number: string;
  title: string;
  synopsis: string;
  duration_sec: string;
  release_date: string;
  editorial_status: CatalogEditorialStatus;
  sort_order: string;
};

type PublicationFormState = {
  playable_type: CatalogPlayableType;
  playable_id: string;
  visibility: CatalogVisibility;
  publication_status: CatalogPublicationStatus;
  available_from: string;
  available_to: string;
  storefront: string;
  featured_rank: string;
  geo_allow: string;
  geo_block: string;
  published_at: string;
};

type PlaybackSourceFormState = {
  playable_type: CatalogPlaybackPlayableType;
  playable_id: string;
  source_kind: CatalogSourceKind;
  delivery_mode: CatalogDeliveryMode;
  origin_url: string;
  duration_sec: string;
  source_status: CatalogSourceStatus;
};

type MediaAssetFormState = {
  owner_type: "title";
  owner_id: string;
  asset_type: CatalogMediaAssetType;
  source_url: string;
  alt_text: string;
  locale: string;
  sort_order: string;
};

type PublicationTarget = {
  playable_type: CatalogPlayableType;
  playable_id: string;
  label: string;
  hint: string;
};

type PlaybackSourceTarget = {
  playable_type: CatalogPlaybackPlayableType;
  playable_id: string;
  label: string;
  hint: string;
};

const EMPTY_TITLE_FORM: TitleFormState = {
  title_type: "movie",
  title: "",
  slug: "",
  original_title: "",
  release_year: "",
  original_language: "",
  country_of_origin: "",
  maturity_rating: "",
  short_synopsis: "",
  long_synopsis: "",
  editorial_status: "draft",
};

const EMPTY_SEASON_FORM: SeasonFormState = {
  season_number: "1",
  title: "",
  synopsis: "",
  editorial_status: "draft",
  sort_order: "1",
};

const EMPTY_EPISODE_FORM: EpisodeFormState = {
  season_id: "",
  episode_number: "1",
  title: "",
  synopsis: "",
  duration_sec: "",
  release_date: "",
  editorial_status: "draft",
  sort_order: "1",
};

const EMPTY_PUBLICATION_FORM: PublicationFormState = {
  playable_type: "movie",
  playable_id: "",
  visibility: "private",
  publication_status: "draft",
  available_from: "",
  available_to: "",
  storefront: "mobile-app",
  featured_rank: "",
  geo_allow: "",
  geo_block: "",
  published_at: "",
};

const EMPTY_PLAYBACK_SOURCE_FORM: PlaybackSourceFormState = {
  playable_type: "movie",
  playable_id: "",
  source_kind: "hls",
  delivery_mode: "gateway",
  origin_url: "",
  duration_sec: "",
  source_status: "draft",
};

const EMPTY_MEDIA_ASSET_FORM: MediaAssetFormState = {
  owner_type: "title",
  owner_id: "",
  asset_type: "poster",
  source_url: "",
  alt_text: "",
  locale: "",
  sort_order: "0",
};

function badgeClassForEditorial(status: CatalogEditorialStatus) {
  if (status === "published") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (status === "ready") return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  if (status === "archived") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/[0.04] text-slate-200";
}

function badgeClassForPublication(status: CatalogPublicationStatus) {
  if (status === "published") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (status === "scheduled") return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  if (status === "archived") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/[0.04] text-slate-200";
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, "0")}` : `${minutes || 1} min`;
}

function formatPublicationWindow(publication: CatalogPublication) {
  if (!publication.available_from && !publication.available_to) return "Toujours actif";
  if (publication.available_from && !publication.available_to) return `À partir du ${new Date(publication.available_from).toLocaleString("fr-FR")}`;
  if (!publication.available_from && publication.available_to) return `Jusqu'au ${new Date(publication.available_to).toLocaleString("fr-FR")}`;
  return `${new Date(publication.available_from!).toLocaleDateString("fr-FR")} → ${new Date(publication.available_to!).toLocaleDateString("fr-FR")}`;
}

function formatOriginHost(originUrl: string) {
  if (originUrl.startsWith("storage://")) {
    return originUrl.replace("storage://", "");
  }
  try {
    const url = new URL(originUrl);
    return url.host;
  } catch {
    return originUrl;
  }
}

function resolveCatalogMediaUrl(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  if (!sourceUrl.startsWith("storage://")) return sourceUrl;

  const normalized = sourceUrl.replace("storage://", "");
  const separatorIndex = normalized.indexOf("/");
  if (separatorIndex <= 0) return null;

  const bucket = normalized.slice(0, separatorIndex);
  const objectPath = normalized.slice(separatorIndex + 1);
  if (!bucket || !objectPath) return null;

  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl ?? null;
}

function pickPreferredAsset(
  assets: CatalogMediaAsset[],
  assetType: CatalogMediaAssetType
) {
  return assets
    .filter((asset) => asset.asset_type === assetType)
    .sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at))[0] ?? null;
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function splitCsvValues(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function readJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as T | null;
  return { response, payload };
}

export default function CatalogPage() {
  const [titles, setTitles] = useState<CatalogTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CatalogTitleType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CatalogEditorialStatus>("all");
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("editorial");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceRefreshing, setWorkspaceRefreshing] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<CatalogMediaAsset[]>([]);
  const [seasons, setSeasons] = useState<CatalogSeason[]>([]);
  const [episodes, setEpisodes] = useState<CatalogEpisode[]>([]);
  const [playbackSources, setPlaybackSources] = useState<CatalogPlaybackSource[]>([]);
  const [publications, setPublications] = useState<CatalogPublication[]>([]);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<CatalogTitle | null>(null);
  const [titleForm, setTitleForm] = useState<TitleFormState>(EMPTY_TITLE_FORM);
  const [savingTitle, setSavingTitle] = useState(false);
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<CatalogSeason | null>(null);
  const [seasonForm, setSeasonForm] = useState<SeasonFormState>(EMPTY_SEASON_FORM);
  const [savingSeason, setSavingSeason] = useState(false);
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<CatalogEpisode | null>(null);
  const [episodeForm, setEpisodeForm] = useState<EpisodeFormState>(EMPTY_EPISODE_FORM);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [editingMediaAsset, setEditingMediaAsset] = useState<CatalogMediaAsset | null>(null);
  const [mediaAssetForm, setMediaAssetForm] = useState<MediaAssetFormState>(EMPTY_MEDIA_ASSET_FORM);
  const [mediaAssetFile, setMediaAssetFile] = useState<File | null>(null);
  const [mediaAssetPreviewUrl, setMediaAssetPreviewUrl] = useState<string | null>(null);
  const [savingMediaAsset, setSavingMediaAsset] = useState(false);
  const [playbackSourceDialogOpen, setPlaybackSourceDialogOpen] = useState(false);
  const [editingPlaybackSource, setEditingPlaybackSource] =
    useState<CatalogPlaybackSource | null>(null);
  const [playbackSourceForm, setPlaybackSourceForm] =
    useState<PlaybackSourceFormState>(EMPTY_PLAYBACK_SOURCE_FORM);
  const [playbackSourceFile, setPlaybackSourceFile] = useState<File | null>(null);
  const [savingPlaybackSource, setSavingPlaybackSource] = useState(false);
  const [publicationDialogOpen, setPublicationDialogOpen] = useState(false);
  const [editingPublication, setEditingPublication] = useState<CatalogPublication | null>(null);
  const [publicationForm, setPublicationForm] = useState<PublicationFormState>(EMPTY_PUBLICATION_FORM);
  const [savingPublication, setSavingPublication] = useState(false);

  const selectedTitle = useMemo(() => titles.find((item) => item.id === selectedTitleId) ?? null, [selectedTitleId, titles]);

  const titleVisualMap = useMemo(() => {
    const map = new Map<
      string,
      {
        poster: CatalogMediaAsset | null;
        backdrop: CatalogMediaAsset | null;
        thumbnail: CatalogMediaAsset | null;
        logo: CatalogMediaAsset | null;
      }
    >();

    for (const title of titles) {
      const assets = mediaAssets.filter(
        (asset) => asset.owner_type === "title" && asset.owner_id === title.id
      );
      map.set(title.id, {
        poster: pickPreferredAsset(assets, "poster"),
        backdrop: pickPreferredAsset(assets, "backdrop"),
        thumbnail: pickPreferredAsset(assets, "thumbnail"),
        logo: pickPreferredAsset(assets, "logo"),
      });
    }

    return map;
  }, [mediaAssets, titles]);

  const selectedTitleVisuals = useMemo(
    () =>
      selectedTitle
        ? titleVisualMap.get(selectedTitle.id) ?? {
            poster: null,
            backdrop: null,
            thumbnail: null,
            logo: null,
          }
        : null,
    [selectedTitle, titleVisualMap]
  );
  const selectedTitlePosterUrl = selectedTitleVisuals
    ? resolveCatalogMediaUrl(
        selectedTitleVisuals.poster?.source_url ??
          selectedTitleVisuals.thumbnail?.source_url ??
          null
      )
    : null;
  const selectedTitleBackdropUrl = selectedTitleVisuals
    ? resolveCatalogMediaUrl(selectedTitleVisuals.backdrop?.source_url ?? null)
    : null;

  useEffect(() => {
    if (!mediaAssetFile) {
      setMediaAssetPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(mediaAssetFile);
    setMediaAssetPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaAssetFile]);

  const stats = useMemo(() => {
    const movies = titles.filter((item) => item.title_type === "movie").length;
    const series = titles.filter((item) => item.title_type === "series").length;
    const ready = titles.filter((item) => item.editorial_status === "ready").length;
    const published = titles.filter((item) => item.editorial_status === "published").length;
    return { total: titles.length, movies, series, qualified: ready + published };
  }, [titles]);

  const filteredTitles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return titles.filter((item) => {
      const matchesType = typeFilter === "all" || item.title_type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.editorial_status === statusFilter;
      const matchesQuery =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.slug.toLowerCase().includes(normalized) ||
        (item.original_title ?? "").toLowerCase().includes(normalized);
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, titles, typeFilter]);

  const publicationTargets = useMemo<PublicationTarget[]>(() => {
    if (!selectedTitle) return [];
    const targets: PublicationTarget[] = [
      {
        playable_type: selectedTitle.title_type,
        playable_id: selectedTitle.id,
        label: `${selectedTitle.title_type === "movie" ? "Film" : "Série"} · ${selectedTitle.title}`,
        hint: "Niveau éditorial principal",
      },
    ];

    if (selectedTitle.title_type === "series") {
      for (const season of seasons) {
        targets.push({
          playable_type: "season",
          playable_id: season.id,
          label: `Saison ${season.season_number}${season.title ? ` · ${season.title}` : ""}`,
          hint: "Publication saisonnière",
        });
      }
      for (const episode of episodes) {
        targets.push({
          playable_type: "episode",
          playable_id: episode.id,
          label: `Épisode ${episode.episode_number} · ${episode.title}`,
          hint: episode.season_id ? "Publication épisode" : "Épisode hors saison",
        });
      }
    }

    return targets;
  }, [episodes, seasons, selectedTitle]);

  const playbackSourceTargets = useMemo<PlaybackSourceTarget[]>(() => {
    if (!selectedTitle) return [];
    if (selectedTitle.title_type === "movie") {
      return [
        {
          playable_type: "movie",
          playable_id: selectedTitle.id,
          label: `Film · ${selectedTitle.title}`,
          hint: "Source VOD principale",
        },
      ];
    }

    return episodes.map((episode) => ({
      playable_type: "episode",
      playable_id: episode.id,
      label: `Épisode ${episode.episode_number} · ${episode.title}`,
      hint: episode.season_id ? "Source par épisode" : "Épisode hors saison",
    }));
  }, [episodes, selectedTitle]);

  const publicationTargetMap = useMemo(
    () => new Map(publicationTargets.map((target) => [`${target.playable_type}:${target.playable_id}`, target])),
    [publicationTargets]
  );

  const playbackSourceTargetMap = useMemo(
    () =>
      new Map(
        playbackSourceTargets.map((target) => [
          `${target.playable_type}:${target.playable_id}`,
          target,
        ])
      ),
    [playbackSourceTargets]
  );

  const relatedPublications = useMemo(() => {
    const allowedKeys = new Set(publicationTargets.map((target) => `${target.playable_type}:${target.playable_id}`));
    return publications.filter((item) => allowedKeys.has(`${item.playable_type}:${item.playable_id}`));
  }, [publicationTargets, publications]);

  const relatedPlaybackSources = useMemo(() => {
    const allowedKeys = new Set(
      playbackSourceTargets.map((target) => `${target.playable_type}:${target.playable_id}`)
    );
    return playbackSources.filter((item) =>
      allowedKeys.has(`${item.playable_type}:${item.playable_id}`)
    );
  }, [playbackSourceTargets, playbackSources]);

  const seasonTitleMap = useMemo(
    () =>
      new Map(
        seasons.map((season) => [
          season.id,
          season.title ? `Saison ${season.season_number} · ${season.title}` : `Saison ${season.season_number}`,
        ])
      ),
    [seasons]
  );

  const loadTitles = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [titlesResult, assetsResult] = await Promise.all([
        readJson<CatalogTitlesResponse>("/api/catalog/titles"),
        readJson<CatalogMediaAssetsResponse>("/api/catalog/media-assets?owner_type=title"),
      ]);
      if (!titlesResult.response.ok || !titlesResult.payload?.ok) {
        throw new Error(titlesResult.payload?.error || "Impossible de charger le catalogue.");
      }
      if (!assetsResult.response.ok || !assetsResult.payload?.ok) {
        throw new Error(assetsResult.payload?.error || "Impossible de charger les visuels catalogue.");
      }
      setTitles(Array.isArray(titlesResult.payload.titles) ? titlesResult.payload.titles : []);
      setMediaAssets(Array.isArray(assetsResult.payload.assets) ? assetsResult.payload.assets : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le catalogue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadWorkspace = async (title: CatalogTitle, soft = false) => {
    if (soft) setWorkspaceRefreshing(true);
    else setWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const requests: Promise<unknown>[] = [
        readJson<CatalogPlaybackSourcesResponse>("/api/catalog/playback-sources"),
        readJson<CatalogPublicationsResponse>("/api/catalog/publications"),
      ];
      if (title.title_type === "series") {
        requests.unshift(
          readJson<CatalogSeasonsResponse>(`/api/catalog/seasons?series_id=${title.id}`),
          readJson<CatalogEpisodesResponse>(`/api/catalog/episodes?series_id=${title.id}`)
        );
      }

      const results = await Promise.all(requests);
      if (title.title_type === "series") {
        const seasonsResult = results[0] as Awaited<ReturnType<typeof readJson<CatalogSeasonsResponse>>>;
        const episodesResult = results[1] as Awaited<ReturnType<typeof readJson<CatalogEpisodesResponse>>>;
        const sourcesResult = results[2] as Awaited<
          ReturnType<typeof readJson<CatalogPlaybackSourcesResponse>>
        >;
        const publicationsResult = results[3] as Awaited<
          ReturnType<typeof readJson<CatalogPublicationsResponse>>
        >;
        if (!seasonsResult.response.ok || !seasonsResult.payload?.ok) throw new Error(seasonsResult.payload?.error || "Impossible de charger les saisons.");
        if (!episodesResult.response.ok || !episodesResult.payload?.ok) throw new Error(episodesResult.payload?.error || "Impossible de charger les épisodes.");
        if (!sourcesResult.response.ok || !sourcesResult.payload?.ok) throw new Error(sourcesResult.payload?.error || "Impossible de charger les sources de lecture.");
        if (!publicationsResult.response.ok || !publicationsResult.payload?.ok) throw new Error(publicationsResult.payload?.error || "Impossible de charger les publications.");
        setSeasons(Array.isArray(seasonsResult.payload.seasons) ? seasonsResult.payload.seasons : []);
        setEpisodes(Array.isArray(episodesResult.payload.episodes) ? episodesResult.payload.episodes : []);
        setPlaybackSources(Array.isArray(sourcesResult.payload.sources) ? sourcesResult.payload.sources : []);
        setPublications(Array.isArray(publicationsResult.payload.publications) ? publicationsResult.payload.publications : []);
      } else {
        const sourcesResult = results[0] as Awaited<
          ReturnType<typeof readJson<CatalogPlaybackSourcesResponse>>
        >;
        const publicationsResult = results[1] as Awaited<
          ReturnType<typeof readJson<CatalogPublicationsResponse>>
        >;
        if (!sourcesResult.response.ok || !sourcesResult.payload?.ok) throw new Error(sourcesResult.payload?.error || "Impossible de charger les sources de lecture.");
        if (!publicationsResult.response.ok || !publicationsResult.payload?.ok) throw new Error(publicationsResult.payload?.error || "Impossible de charger les publications.");
        setSeasons([]);
        setEpisodes([]);
        setPlaybackSources(Array.isArray(sourcesResult.payload.sources) ? sourcesResult.payload.sources : []);
        setPublications(Array.isArray(publicationsResult.payload.publications) ? publicationsResult.payload.publications : []);
      }
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "Impossible de charger la structure du catalogue.");
      setSeasons([]);
      setEpisodes([]);
      setPlaybackSources([]);
      setPublications([]);
    } finally {
      setWorkspaceLoading(false);
      setWorkspaceRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTitles(false);
  }, []);

  useEffect(() => {
    if (titles.length === 0) {
      setSelectedTitleId(null);
      setMediaAssets([]);
      setSeasons([]);
      setEpisodes([]);
      setPlaybackSources([]);
      setPublications([]);
      return;
    }
    if (!selectedTitleId || !titles.some((item) => item.id === selectedTitleId)) {
      setSelectedTitleId(titles[0]?.id ?? null);
    }
  }, [selectedTitleId, titles]);

  useEffect(() => {
    if (!selectedTitle) return;
    void loadWorkspace(selectedTitle, false);
  }, [selectedTitle]);

  useEffect(() => {
    if (selectedTitle?.title_type !== "series" && activeTab === "structure") {
      setActiveTab("editorial");
    }
  }, [activeTab, selectedTitle?.title_type]);

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const openCreateTitle = () => {
    setEditingTitle(null);
    setTitleForm(EMPTY_TITLE_FORM);
    setTitleDialogOpen(true);
  };

  const openEditTitle = (title: CatalogTitle) => {
    setEditingTitle(title);
    setTitleForm({
      title_type: title.title_type,
      title: title.title,
      slug: title.slug,
      original_title: title.original_title ?? "",
      release_year: title.release_year ? String(title.release_year) : "",
      original_language: title.original_language ?? "",
      country_of_origin: title.country_of_origin.join(", "),
      maturity_rating: title.maturity_rating ?? "",
      short_synopsis: title.short_synopsis ?? "",
      long_synopsis: title.long_synopsis ?? "",
      editorial_status: title.editorial_status,
    });
    setTitleDialogOpen(true);
  };

  const openCreateSeason = () => {
    setEditingSeason(null);
    setSeasonForm({ ...EMPTY_SEASON_FORM, season_number: String(seasons.length + 1), sort_order: String(seasons.length + 1) });
    setSeasonDialogOpen(true);
  };

  const openEditSeason = (season: CatalogSeason) => {
    setEditingSeason(season);
    setSeasonForm({
      season_number: String(season.season_number),
      title: season.title ?? "",
      synopsis: season.synopsis ?? "",
      editorial_status: season.editorial_status,
      sort_order: String(season.sort_order),
    });
    setSeasonDialogOpen(true);
  };

  const openCreateEpisode = (seasonId?: string) => {
    const nextEpisodeNumber = episodes.length + 1;
    setEditingEpisode(null);
    setEpisodeForm({ ...EMPTY_EPISODE_FORM, season_id: seasonId ?? "", episode_number: String(nextEpisodeNumber), sort_order: String(nextEpisodeNumber) });
    setEpisodeDialogOpen(true);
  };

  const openCreateMediaAsset = (assetType: CatalogMediaAssetType = "poster") => {
    if (!selectedTitle) return;
    setEditingMediaAsset(null);
    setMediaAssetFile(null);
    setMediaAssetForm({
      ...EMPTY_MEDIA_ASSET_FORM,
      owner_id: selectedTitle.id,
      asset_type: assetType,
    });
    setMediaDialogOpen(true);
  };

  const openEditMediaAsset = (asset: CatalogMediaAsset) => {
    setEditingMediaAsset(asset);
    setMediaAssetFile(null);
    setMediaAssetForm({
      owner_type: "title",
      owner_id: asset.owner_id,
      asset_type: asset.asset_type,
      source_url: asset.source_url,
      alt_text: asset.alt_text ?? "",
      locale: asset.locale ?? "",
      sort_order: String(asset.sort_order),
    });
    setMediaDialogOpen(true);
  };

  const openEditEpisode = (episode: CatalogEpisode) => {
    setEditingEpisode(episode);
    setEpisodeForm({
      season_id: episode.season_id ?? "",
      episode_number: String(episode.episode_number),
      title: episode.title,
      synopsis: episode.synopsis ?? "",
      duration_sec: episode.duration_sec ? String(episode.duration_sec) : "",
      release_date: episode.release_date ?? "",
      editorial_status: episode.editorial_status,
      sort_order: String(episode.sort_order),
    });
    setEpisodeDialogOpen(true);
  };

  const openCreatePublication = (target?: PublicationTarget) => {
    const fallback = target ?? publicationTargets[0];
    if (!fallback) {
      toast.error("Aucune cible de publication n'est disponible pour ce titre.");
      return;
    }
    setEditingPublication(null);
    setPublicationForm({ ...EMPTY_PUBLICATION_FORM, playable_type: fallback.playable_type, playable_id: fallback.playable_id });
    setPublicationDialogOpen(true);
  };

  const openCreatePlaybackSource = (target?: PlaybackSourceTarget) => {
    const fallback = target ?? playbackSourceTargets[0];
    if (!fallback) {
      toast.error("Aucune cible de lecture n'est disponible pour ce titre.");
      return;
    }
    setEditingPlaybackSource(null);
    setPlaybackSourceForm({
      ...EMPTY_PLAYBACK_SOURCE_FORM,
      playable_type: fallback.playable_type,
      playable_id: fallback.playable_id,
    });
    setPlaybackSourceFile(null);
    setPlaybackSourceDialogOpen(true);
  };

  const openEditPlaybackSource = (source: CatalogPlaybackSource) => {
    setEditingPlaybackSource(source);
    setPlaybackSourceForm({
      playable_type: source.playable_type,
      playable_id: source.playable_id,
      source_kind: source.source_kind,
      delivery_mode: source.delivery_mode,
      origin_url: source.origin_url,
      duration_sec: source.duration_sec !== null ? String(source.duration_sec) : "",
      source_status: source.source_status,
    });
    setPlaybackSourceFile(null);
    setPlaybackSourceDialogOpen(true);
  };

  const openEditPublication = (publication: CatalogPublication) => {
    setEditingPublication(publication);
    setPublicationForm({
      playable_type: publication.playable_type,
      playable_id: publication.playable_id,
      visibility: publication.visibility,
      publication_status: publication.publication_status,
      available_from: toDatetimeLocal(publication.available_from),
      available_to: toDatetimeLocal(publication.available_to),
      storefront: publication.storefront,
      featured_rank: publication.featured_rank !== null ? String(publication.featured_rank) : "",
      geo_allow: publication.geo.allow.join(", "),
      geo_block: publication.geo.block.join(", "),
      published_at: toDatetimeLocal(publication.published_at),
    });
    setPublicationDialogOpen(true);
  };

  const onSaveTitle = async () => {
    if (!titleForm.title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(
        editingTitle ? `/api/catalog/titles/${editingTitle.id}` : "/api/catalog/titles",
        {
          method: editingTitle ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title_type: titleForm.title_type,
            title: titleForm.title.trim(),
            slug: titleForm.slug.trim(),
            original_title: titleForm.original_title.trim() || null,
            release_year: titleForm.release_year.trim() ? Number(titleForm.release_year.trim()) : null,
            original_language: titleForm.original_language.trim() || null,
            country_of_origin: splitCsvValues(titleForm.country_of_origin),
            maturity_rating: titleForm.maturity_rating.trim() || null,
            short_synopsis: titleForm.short_synopsis.trim() || null,
            long_synopsis: titleForm.long_synopsis.trim() || null,
            editorial_status: titleForm.editorial_status,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as CatalogTitleResponse | null;
      if (!response.ok || !payload?.ok || !payload.title) {
        throw new Error(payload?.error || "Impossible d'enregistrer le titre.");
      }

      setTitles((current) =>
        editingTitle
          ? current.map((item) => (item.id === payload.title!.id ? payload.title! : item))
          : [payload.title!, ...current]
      );
      setSelectedTitleId(payload.title.id);
      setTitleDialogOpen(false);
      setEditingTitle(null);
      setTitleForm(EMPTY_TITLE_FORM);
      toast.success(editingTitle ? "Titre mis à jour." : "Titre créé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer le titre.");
    } finally {
      setSavingTitle(false);
    }
  };

  const onSaveSeason = async () => {
    if (!selectedTitle || selectedTitle.title_type !== "series") return;
    if (!seasonForm.season_number.trim()) {
      toast.error("Le numéro de saison est requis.");
      return;
    }

    setSavingSeason(true);
    try {
      const response = await fetch(
        editingSeason ? `/api/catalog/seasons/${editingSeason.id}` : "/api/catalog/seasons",
        {
          method: editingSeason ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            series_id: selectedTitle.id,
            season_number: Number(seasonForm.season_number.trim()),
            title: seasonForm.title.trim() || null,
            synopsis: seasonForm.synopsis.trim() || null,
            editorial_status: seasonForm.editorial_status,
            sort_order: Number(seasonForm.sort_order.trim()),
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as CatalogSeasonResponse | null;
      if (!response.ok || !payload?.ok || !payload.season) {
        throw new Error(payload?.error || "Impossible d'enregistrer la saison.");
      }

      setSeasons((current) => {
        const next = editingSeason
          ? current.map((item) => (item.id === payload.season!.id ? payload.season! : item))
          : [...current, payload.season!];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.season_number - b.season_number);
      });
      setSeasonDialogOpen(false);
      setEditingSeason(null);
      setSeasonForm(EMPTY_SEASON_FORM);
      toast.success(editingSeason ? "Saison mise à jour." : "Saison créée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la saison.");
    } finally {
      setSavingSeason(false);
    }
  };

  const onSaveEpisode = async () => {
    if (!selectedTitle || selectedTitle.title_type !== "series") return;
    if (!episodeForm.title.trim() || !episodeForm.episode_number.trim()) {
      toast.error("Le titre et le numéro d'épisode sont requis.");
      return;
    }

    setSavingEpisode(true);
    try {
      const response = await fetch(
        editingEpisode ? `/api/catalog/episodes/${editingEpisode.id}` : "/api/catalog/episodes",
        {
          method: editingEpisode ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            series_id: selectedTitle.id,
            season_id: episodeForm.season_id.trim() || null,
            episode_number: Number(episodeForm.episode_number.trim()),
            title: episodeForm.title.trim(),
            synopsis: episodeForm.synopsis.trim() || null,
            duration_sec: episodeForm.duration_sec.trim() ? Number(episodeForm.duration_sec.trim()) : null,
            release_date: episodeForm.release_date.trim() || null,
            editorial_status: episodeForm.editorial_status,
            sort_order: Number(episodeForm.sort_order.trim()),
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as CatalogEpisodeResponse | null;
      if (!response.ok || !payload?.ok || !payload.episode) {
        throw new Error(payload?.error || "Impossible d'enregistrer l'épisode.");
      }

      setEpisodes((current) => {
        const next = editingEpisode
          ? current.map((item) => (item.id === payload.episode!.id ? payload.episode! : item))
          : [...current, payload.episode!];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.episode_number - b.episode_number);
      });
      setEpisodeDialogOpen(false);
      setEditingEpisode(null);
      setEpisodeForm(EMPTY_EPISODE_FORM);
      toast.success(editingEpisode ? "Épisode mis à jour." : "Épisode créé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer l'épisode.");
    } finally {
      setSavingEpisode(false);
    }
  };

  const onSaveMediaAsset = async () => {
    if (!selectedTitle) return;
    if (!mediaAssetForm.source_url.trim() && !mediaAssetFile) {
      toast.error("Ajoutez une URL de visuel ou téléversez une image.");
      return;
    }

    setSavingMediaAsset(true);
    try {
      let nextSourceUrl = mediaAssetForm.source_url.trim();

      if (mediaAssetFile) {
        const uploadInitResponse = await fetch("/api/catalog/media-assets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_type: "title",
            owner_id: selectedTitle.id,
            file_name: mediaAssetFile.name,
            content_type: mediaAssetFile.type || null,
          }),
        });

        const uploadInitPayload = (await uploadInitResponse.json().catch(() => null)) as
          | CatalogMediaUploadResponse
          | null;
        if (!uploadInitResponse.ok || !uploadInitPayload?.ok || !uploadInitPayload.upload) {
          throw new Error(uploadInitPayload?.error || "Impossible de préparer l'upload du visuel.");
        }

        const uploadRes = await supabase.storage
          .from(uploadInitPayload.upload.bucket)
          .uploadToSignedUrl(
            uploadInitPayload.upload.path,
            uploadInitPayload.upload.token,
            mediaAssetFile
          );

        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || "Impossible d'envoyer le visuel.");
        }

        nextSourceUrl = uploadInitPayload.upload.origin_url;
      }

      const response = await fetch(
        editingMediaAsset
          ? `/api/catalog/media-assets/${editingMediaAsset.id}`
          : "/api/catalog/media-assets",
        {
          method: editingMediaAsset ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_type: "title",
            owner_id: selectedTitle.id,
            asset_type: mediaAssetForm.asset_type,
            source_url: nextSourceUrl,
            storage_provider: nextSourceUrl.startsWith(`storage://${CATALOG_MEDIA_UPLOAD_BUCKET}/`)
              ? "supabase"
              : null,
            alt_text: mediaAssetForm.alt_text.trim() || null,
            locale: mediaAssetForm.locale.trim() || null,
            sort_order: mediaAssetForm.sort_order.trim()
              ? Number(mediaAssetForm.sort_order.trim())
              : 0,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | CatalogMediaAssetResponse
        | null;
      if (!response.ok || !payload?.ok || !payload.asset) {
        throw new Error(payload?.error || "Impossible d'enregistrer le visuel.");
      }

      setMediaAssets((current) => {
        const next = editingMediaAsset
          ? current.map((item) => (item.id === payload.asset!.id ? payload.asset! : item))
          : [payload.asset!, ...current];
        return next.sort(
          (left, right) =>
            left.owner_id.localeCompare(right.owner_id) ||
            left.asset_type.localeCompare(right.asset_type) ||
            left.sort_order - right.sort_order
        );
      });
      setMediaDialogOpen(false);
      setEditingMediaAsset(null);
      setMediaAssetForm(EMPTY_MEDIA_ASSET_FORM);
      setMediaAssetFile(null);
      toast.success(editingMediaAsset ? "Visuel mis à jour." : "Visuel ajouté.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer le visuel.");
    } finally {
      setSavingMediaAsset(false);
    }
  };

  const onDeleteMediaAsset = async (asset: CatalogMediaAsset) => {
    const confirmed = window.confirm(
      `Supprimer le visuel "${formatCatalogMediaAssetTypeLabel(asset.asset_type)}" ?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/catalog/media-assets/${asset.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as CatalogActionResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de supprimer le visuel.");
      }

      setMediaAssets((current) => current.filter((item) => item.id !== asset.id));
      if (editingMediaAsset?.id === asset.id) {
        setEditingMediaAsset(null);
        setMediaAssetFile(null);
        setMediaAssetForm(EMPTY_MEDIA_ASSET_FORM);
        setMediaDialogOpen(false);
      }
      toast.success("Visuel supprimé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de supprimer le visuel.");
    }
  };

  const onSavePublication = async () => {
    if (!publicationForm.playable_id) {
      toast.error("Choisissez une cible à publier.");
      return;
    }

    setSavingPublication(true);
    try {
      const response = await fetch(
        editingPublication
          ? `/api/catalog/publications/${editingPublication.id}`
          : "/api/catalog/publications",
        {
          method: editingPublication ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playable_type: publicationForm.playable_type,
            playable_id: publicationForm.playable_id,
            visibility: publicationForm.visibility,
            publication_status: publicationForm.publication_status,
            available_from: fromDatetimeLocal(publicationForm.available_from),
            available_to: fromDatetimeLocal(publicationForm.available_to),
            storefront: publicationForm.storefront.trim() || "mobile-app",
            featured_rank: publicationForm.featured_rank.trim() ? Number(publicationForm.featured_rank.trim()) : null,
            geo: {
              allow: splitCsvValues(publicationForm.geo_allow),
              block: splitCsvValues(publicationForm.geo_block),
            },
            published_at: fromDatetimeLocal(publicationForm.published_at),
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as CatalogPublicationResponse | null;
      if (!response.ok || !payload?.ok || !payload.publication) {
        throw new Error(payload?.error || "Impossible d'enregistrer la publication.");
      }

      setPublications((current) => {
        const next = editingPublication
          ? current.map((item) => (item.id === payload.publication!.id ? payload.publication! : item))
          : [payload.publication!, ...current];
        return next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
      setPublicationDialogOpen(false);
      setEditingPublication(null);
      setPublicationForm(EMPTY_PUBLICATION_FORM);
      toast.success(editingPublication ? "Publication mise à jour." : "Publication créée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la publication.");
    } finally {
      setSavingPublication(false);
    }
  };

  const onSavePlaybackSource = async () => {
    if (!playbackSourceForm.playable_id) {
      toast.error("Choisissez une cible de lecture.");
      return;
    }

    if (!playbackSourceForm.origin_url.trim() && !playbackSourceFile) {
      toast.error("Renseignez une URL source ou sélectionnez un fichier vidéo.");
      return;
    }

    setSavingPlaybackSource(true);
    try {
      let nextOriginUrl = playbackSourceForm.origin_url.trim();
      let nextSourceKind = playbackSourceForm.source_kind;

      if (playbackSourceFile) {
        const uploadInitResponse = await fetch("/api/catalog/playback-sources/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playable_type: playbackSourceForm.playable_type,
            playable_id: playbackSourceForm.playable_id,
            file_name: playbackSourceFile.name,
            content_type: playbackSourceFile.type || null,
          }),
        });

        const uploadInitPayload = (await uploadInitResponse.json().catch(() => null)) as
          | CatalogPlaybackUploadResponse
          | null;
        if (!uploadInitResponse.ok || !uploadInitPayload?.ok || !uploadInitPayload.upload) {
          throw new Error(uploadInitPayload?.error || "Impossible de préparer l'upload.");
        }

        const uploadRes = await supabase.storage
          .from(uploadInitPayload.upload.bucket)
          .uploadToSignedUrl(
            uploadInitPayload.upload.path,
            uploadInitPayload.upload.token,
            playbackSourceFile
          );

        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || "Impossible d'envoyer le fichier.");
        }

        nextOriginUrl = uploadInitPayload.upload.origin_url;
        nextSourceKind = "file";
      }

      const response = await fetch(
        editingPlaybackSource
          ? `/api/catalog/playback-sources/${editingPlaybackSource.id}`
          : "/api/catalog/playback-sources",
        {
          method: editingPlaybackSource ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playable_type: playbackSourceForm.playable_type,
            playable_id: playbackSourceForm.playable_id,
            source_kind: nextSourceKind,
            delivery_mode: playbackSourceForm.delivery_mode,
            origin_url: nextOriginUrl,
            duration_sec: playbackSourceForm.duration_sec.trim()
              ? Number(playbackSourceForm.duration_sec.trim())
              : null,
            source_status: playbackSourceForm.source_status,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | CatalogPlaybackSourceResponse
        | null;
      if (!response.ok || !payload?.ok || !payload.source) {
        throw new Error(payload?.error || "Impossible d'enregistrer la source.");
      }

      setPlaybackSources((current) => {
        const next = editingPlaybackSource
          ? current.map((item) => (item.id === payload.source!.id ? payload.source! : item))
          : [payload.source!, ...current];
        return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      });
      setPlaybackSourceDialogOpen(false);
      setEditingPlaybackSource(null);
      setPlaybackSourceForm(EMPTY_PLAYBACK_SOURCE_FORM);
      setPlaybackSourceFile(null);
      toast.success(
        editingPlaybackSource ? "Source mise à jour." : "Source de lecture ajoutée."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la source.");
    } finally {
      setSavingPlaybackSource(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Catalogue"
        subtitle="Gérez les films, séries, saisons, épisodes et publications VOD."
        breadcrumbs={[
          { label: "Oniix Console", href: "/dashboard" },
          { label: "Catalogue" },
        ]}
        icon={<FolderKanban className="size-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => void loadTitles(true)}>
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={openCreateTitle}>
              <Plus className="size-4" />
              Nouveau titre
            </Button>
          </>
        }
      />

      <KpiRow>
        <KpiCard label="Titres" value={stats.total} hint="Films et séries du tenant actif." icon={<FolderKanban className="size-4" />} loading={loading} />
        <KpiCard label="Films" value={stats.movies} hint="Unitaires prêts pour la VOD." tone="info" icon={<Film className="size-4" />} loading={loading} />
        <KpiCard label="Séries" value={stats.series} hint="Contenus structurés en saisons et épisodes." tone="success" icon={<Clapperboard className="size-4" />} loading={loading} />
        <KpiCard label="Prêts / publiés" value={`${stats.qualified} / ${stats.total}`} hint="Titres déjà qualifiés pour diffusion." tone="warning" icon={<Sparkles className="size-4" />} loading={loading} />
      </KpiRow>

      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6 2xl:sticky 2xl:top-6 2xl:self-start">
          <FilterBar onReset={resetFilters} resetDisabled={!query && typeFilter === "all" && statusFilter === "all"}>
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Rechercher un titre du catalogue"
                placeholder="Rechercher par titre, slug ou titre original"
                className="pl-11"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | CatalogTitleType)}>
              <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Tous les types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="movie">Films</SelectItem>
                <SelectItem value="series">Séries</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | CatalogEditorialStatus)}>
              <SelectTrigger className="min-w-[180px]"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="ready">Prêt</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <DataTableShell
            title="Bibliothèque éditoriale"
            description={`${filteredTitles.length} résultat(s) sur ${titles.length} titre(s).`}
            loading={loading}
            error={error}
            onRetry={() => void loadTitles(false)}
            isEmpty={!loading && !error && filteredTitles.length === 0}
            emptyTitle="Aucun titre éditorial"
            emptyDescription="Créez le premier titre pour ouvrir les saisons, épisodes et publications."
            emptyAction={<Button onClick={openCreateTitle}><Plus className="size-4" />Créer un titre</Button>}
          >
            <div className="divide-y divide-white/10">
              {filteredTitles.map((item) => {
                const selected = item.id === selectedTitleId;
                const visuals = titleVisualMap.get(item.id);
                const posterUrl = resolveCatalogMediaUrl(
                  visuals?.poster?.source_url ?? visuals?.thumbnail?.source_url ?? null
                );
                const assetCount = mediaAssets.filter(
                  (asset) => asset.owner_type === "title" && asset.owner_id === item.id
                ).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTitleId(item.id)}
                    aria-pressed={selected}
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition ${selected ? "bg-[var(--brand-primary)]/10 ring-1 ring-inset ring-[var(--brand-primary)]/25" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="relative hidden aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04] sm:block">
                      {posterUrl ? (
                        <Image src={posterUrl} alt={item.title} fill unoptimized sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500">
                          <ImageIcon className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                          <div className="mt-1 truncate text-xs text-slate-400">
                            /{item.slug}
                            {item.original_title ? ` · ${item.original_title}` : ""}
                          </div>
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                            {item.short_synopsis || "Ajoutez un synopsis court, un poster et une source de lecture pour préparer une fiche catalogue crédible."}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge variant="outline">{formatCatalogTitleTypeLabel(item.title_type)}</Badge>
                          <Badge className={badgeClassForEditorial(item.editorial_status)}>
                            {formatCatalogStatusLabel(item.editorial_status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>Année: {item.release_year ?? "--"}</span>
                        <span>Langue: {(item.original_language ?? "").trim() || "--"}</span>
                        <span>Visuels: {assetCount}</span>
                        <span>Mis à jour: {formatUpdatedAt(item.updated_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DataTableShell>
        </div>

        {!selectedTitle ? (
          <Card>
            <CardHeader>
              <CardTitle>Choisissez un titre</CardTitle>
              <CardDescription>
                Sélectionnez un film ou une série pour ouvrir la fiche éditoriale, la structure et les publications.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="relative min-h-[220px] overflow-hidden border-b border-white/10">
                {selectedTitleBackdropUrl ? (
                  <Image
                    src={selectedTitleBackdropUrl}
                    alt={selectedTitle.title}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,13,20,0.3),rgba(8,13,20,0.92))]" />
                <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-end">
                  <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
                    {selectedTitlePosterUrl ? (
                      <Image
                        src={selectedTitlePosterUrl}
                        alt={selectedTitle.title}
                        fill
                        unoptimized
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">
                        <ImageIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatCatalogTitleTypeLabel(selectedTitle.title_type)}</Badge>
                        <Badge className={badgeClassForEditorial(selectedTitle.editorial_status)}>
                          {formatCatalogStatusLabel(selectedTitle.editorial_status)}
                        </Badge>
                        <Badge variant="secondary">
                          {selectedTitleVisuals?.poster || selectedTitleVisuals?.backdrop || selectedTitleVisuals?.thumbnail
                            ? "Visuels prêts"
                            : "Visuels à compléter"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-3xl font-semibold tracking-tight text-white">{selectedTitle.title}</div>
                      <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                        {selectedTitle.short_synopsis || "Ajoutez un résumé court pour le catalogue et les vitrines."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl text-white">Pilotage éditorial</CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-300">
                      Gérez la fiche, les visuels, la structure, les sources et les publications depuis une seule surface.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => void loadWorkspace(selectedTitle, true)}>
                      <RefreshCw className={`size-4 ${workspaceRefreshing ? "animate-spin" : ""}`} />
                      Rafraîchir
                    </Button>
                    <Button variant="outline" onClick={() => openEditTitle(selectedTitle)}>
                      <Edit3 className="size-4" />
                      Modifier la fiche
                    </Button>
                    <Button variant="outline" onClick={() => openCreateMediaAsset("poster")}>
                      <ImageIcon className="size-4" />
                      Ajouter un visuel
                    </Button>
                    <Button variant="outline" onClick={() => openCreatePlaybackSource()}>
                      <Link2 className="size-4" />
                      Ajouter une source
                    </Button>
                    <Button onClick={() => openCreatePublication()}>
                      <Plus className="size-4" />
                      Nouvelle publication
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</div>
                  <div className="mt-2 text-sm font-semibold text-white">/{selectedTitle.slug}</div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Structure</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {selectedTitle.title_type === "series" ? `${seasons.length} saison(s) · ${episodes.length} épisode(s)` : "Film autonome"}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Publications</div>
                  <div className="mt-2 text-sm font-semibold text-white">{relatedPublications.length} publication(s)</div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visuels</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {mediaAssets.filter((asset) => asset.owner_type === "title" && asset.owner_id === selectedTitle.id).length} asset(s)
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sources</div>
                  <div className="mt-2 text-sm font-semibold text-white">{relatedPlaybackSources.length} source(s)</div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Métadonnées</div>
                  <div className="mt-2 text-sm font-semibold text-white">{selectedTitle.original_language || "À compléter"}</div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-5 h-auto flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none">
                <TabsTrigger value="editorial">Fiche éditoriale</TabsTrigger>
                <TabsTrigger value="visuals">Visuels</TabsTrigger>
                {selectedTitle.title_type === "series" ? <TabsTrigger value="structure">Structure série</TabsTrigger> : null}
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="publications">Publications</TabsTrigger>
              </TabsList>

              <TabsContent value="editorial" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fiche éditoriale</CardTitle>
                    <CardDescription>Métadonnées principales du contenu.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Titre original</div>
                        <div className="mt-2 text-sm text-white">{selectedTitle.original_title || "Non renseigné"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Année de sortie</div>
                        <div className="mt-2 text-sm text-white">{selectedTitle.release_year ?? "--"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pays d’origine</div>
                        <div className="mt-2 text-sm text-white">{selectedTitle.country_of_origin.length > 0 ? selectedTitle.country_of_origin.join(", ") : "Non renseignés"}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Synopsis long</div>
                      <div className="mt-2 text-sm leading-7 text-slate-300">
                        {selectedTitle.long_synopsis || "Ajoutez un synopsis complet pour les fiches détail et les pages partenaires."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {selectedTitle.title_type === "series" ? (
                <TabsContent value="structure" className="space-y-6">
                  <DataTableShell
                    title="Saisons"
                    description="Organisation éditoriale de la série."
                    loading={workspaceLoading}
                    error={workspaceError}
                    onRetry={() => void loadWorkspace(selectedTitle, false)}
                    isEmpty={!workspaceLoading && !workspaceError && seasons.length === 0}
                    emptyTitle="Aucune saison"
                    emptyDescription="Créez la première saison de cette série."
                    emptyAction={<Button onClick={openCreateSeason}><Plus className="size-4" />Nouvelle saison</Button>}
                    footer={<div className="flex justify-end"><Button onClick={openCreateSeason}><Plus className="size-4" />Ajouter une saison</Button></div>}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Saison</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Titre éditorial</TableHead>
                          <TableHead>Dernière mise à jour</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seasons.map((season) => (
                          <TableRow key={season.id}>
                            <TableCell className="font-medium text-white">Saison {season.season_number}</TableCell>
                            <TableCell><Badge className={badgeClassForEditorial(season.editorial_status)}>{formatCatalogStatusLabel(season.editorial_status)}</Badge></TableCell>
                            <TableCell className="text-slate-300">{season.title || "--"}</TableCell>
                            <TableCell className="text-slate-300">{formatUpdatedAt(season.updated_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditSeason(season)}><Edit3 className="size-4" />Modifier</Button>
                                <Button variant="ghost" size="sm" onClick={() => openCreateEpisode(season.id)}><Plus className="size-4" />Épisode</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>

                  <DataTableShell
                    title="Épisodes"
                    description="Parcours épisode par épisode."
                    loading={workspaceLoading}
                    error={workspaceError}
                    onRetry={() => void loadWorkspace(selectedTitle, false)}
                    isEmpty={!workspaceLoading && !workspaceError && episodes.length === 0}
                    emptyTitle="Aucun épisode"
                    emptyDescription="Ajoutez les premiers épisodes."
                    emptyAction={<Button onClick={() => openCreateEpisode()}><Plus className="size-4" />Nouvel épisode</Button>}
                    footer={<div className="flex justify-end"><Button onClick={() => openCreateEpisode()}><Plus className="size-4" />Ajouter un épisode</Button></div>}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Épisode</TableHead>
                          <TableHead>Saison</TableHead>
                          <TableHead>Durée</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Sortie</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {episodes.map((episode) => (
                          <TableRow key={episode.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-white">Épisode {episode.episode_number} · {episode.title}</div>
                                <div className="mt-1 text-xs text-slate-400">Ordre {episode.sort_order}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">{episode.season_id ? seasonTitleMap.get(episode.season_id) ?? "--" : "Hors saison"}</TableCell>
                            <TableCell className="text-slate-300">{formatDuration(episode.duration_sec)}</TableCell>
                            <TableCell><Badge className={badgeClassForEditorial(episode.editorial_status)}>{formatCatalogStatusLabel(episode.editorial_status)}</Badge></TableCell>
                            <TableCell className="text-slate-300">{episode.release_date || "--"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditEpisode(episode)}><Edit3 className="size-4" />Modifier</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    openCreatePlaybackSource({
                                      playable_type: "episode",
                                      playable_id: episode.id,
                                      label: `Épisode ${episode.episode_number} · ${episode.title}`,
                                      hint: "Source par épisode",
                                    })
                                  }
                                >
                                  <Link2 className="size-4" />
                                  Source
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openCreatePublication({ playable_type: "episode", playable_id: episode.id, label: `Épisode ${episode.episode_number} · ${episode.title}`, hint: "Publication épisode" })}><Globe2 className="size-4" />Publier</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>
                </TabsContent>
              ) : null}

              <TabsContent value="visuals" className="space-y-6">
                <DataTableShell
                  title="Visuels du titre"
                  description="Posters, backdrops, miniatures et logos."
                  loading={loading}
                  error={error}
                  onRetry={() => void loadTitles(false)}
                  isEmpty={!loading && !error && mediaAssets.filter((asset) => asset.owner_type === "title" && asset.owner_id === selectedTitle.id).length === 0}
                  emptyTitle="Aucun visuel"
                  emptyDescription="Ajoutez les visuels principaux du titre."
                  emptyAction={<Button onClick={() => openCreateMediaAsset("poster")}><Plus className="size-4" />Ajouter un visuel</Button>}
                  footer={<div className="flex justify-end"><Button onClick={() => openCreateMediaAsset("poster")}><Plus className="size-4" />Nouveau visuel</Button></div>}
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    {["poster", "thumbnail", "backdrop", "logo"].map((assetType) => {
                      const asset = pickPreferredAsset(
                        mediaAssets.filter(
                          (entry) =>
                            entry.owner_type === "title" &&
                            entry.owner_id === selectedTitle.id
                        ),
                        assetType as CatalogMediaAssetType
                      );
                      const previewUrl = resolveCatalogMediaUrl(asset?.source_url ?? null);

                      return (
                        <Card key={assetType} className="overflow-hidden border-white/10 bg-white/[0.03]">
                          <div className="relative aspect-video overflow-hidden border-b border-white/10 bg-black/20">
                            {previewUrl ? (
                              <Image
                                src={previewUrl}
                                alt={asset.alt_text || selectedTitle.title}
                                fill
                                unoptimized
                                sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 100vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-slate-500">
                                <ImageIcon className="size-8" />
                              </div>
                            )}
                          </div>
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  {formatCatalogMediaAssetTypeLabel(assetType)}
                                </div>
                                <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                                  {asset?.source_url
                                    ? formatOriginHost(asset.source_url)
                                    : "Aucun visuel défini"}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  asset ? openEditMediaAsset(asset) : openCreateMediaAsset(assetType as CatalogMediaAssetType)
                                }
                              >
                                <Edit3 className="size-4" />
                                {asset ? "Modifier" : "Ajouter"}
                              </Button>
                            </div>
                            {asset ? (
                              <div className="flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-200 hover:text-rose-100"
                                  onClick={() => void onDeleteMediaAsset(asset)}
                                >
                                  Retirer
                                </Button>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </DataTableShell>
              </TabsContent>

              <TabsContent value="sources" className="space-y-6">
                <DataTableShell
                  title="Sources de lecture"
                  description="Sources HLS, DASH et fichiers liés au titre."
                  loading={workspaceLoading}
                  error={workspaceError}
                  onRetry={() => void loadWorkspace(selectedTitle, false)}
                  isEmpty={!workspaceLoading && !workspaceError && relatedPlaybackSources.length === 0}
                  emptyTitle="Aucune source de lecture"
                  emptyDescription="Ajoutez une source de lecture."
                  emptyAction={<Button onClick={() => openCreatePlaybackSource()}><Plus className="size-4" />Ajouter une source</Button>}
                  footer={<div className="flex justify-end"><Button onClick={() => openCreatePlaybackSource()}><Plus className="size-4" />Nouvelle source</Button></div>}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contenu</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Routage</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatedPlaybackSources.map((source) => {
                        const target =
                          playbackSourceTargetMap.get(
                            `${source.playable_type}:${source.playable_id}`
                          ) ?? null;
                        return (
                          <TableRow key={source.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-white">
                                  {target?.label || source.playable_type}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {target?.hint || "Source VOD"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatCatalogSourceKindLabel(source.source_kind)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatCatalogDeliveryModeLabel(source.delivery_mode)}
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate text-sm text-white">
                                  {formatOriginHost(source.origin_url)}
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-400">
                                  {source.origin_url}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={badgeClassForEditorial(source.source_status)}>
                                {formatCatalogStatusLabel(source.source_status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPlaybackSource(source)}
                              >
                                <Edit3 className="size-4" />
                                Modifier
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </DataTableShell>
              </TabsContent>

              <TabsContent value="publications" className="space-y-6">
                <DataTableShell
                  title="Publications"
                  description="Visibilité, fenêtre et distribution."
                  loading={workspaceLoading}
                  error={workspaceError}
                  onRetry={() => void loadWorkspace(selectedTitle, false)}
                  isEmpty={!workspaceLoading && !workspaceError && relatedPublications.length === 0}
                  emptyTitle="Aucune publication"
                  emptyDescription="Créez la première publication du contenu."
                  emptyAction={<Button onClick={() => openCreatePublication()}><Plus className="size-4" />Créer une publication</Button>}
                  footer={<div className="flex justify-end"><Button onClick={() => openCreatePublication()}><Plus className="size-4" />Nouvelle publication</Button></div>}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contenu</TableHead>
                        <TableHead>Storefront</TableHead>
                        <TableHead>Visibilité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fenêtre</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatedPublications.map((publication) => {
                        const target = publicationTargetMap.get(`${publication.playable_type}:${publication.playable_id}`) ?? null;
                        return (
                          <TableRow key={publication.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-white">{target?.label || publication.playable_type}</div>
                                <div className="mt-1 text-xs text-slate-400">{target?.hint || "Publication éditoriale"}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">{publication.storefront}</TableCell>
                            <TableCell><Badge variant="secondary">{formatCatalogVisibilityLabel(publication.visibility)}</Badge></TableCell>
                            <TableCell><Badge className={badgeClassForPublication(publication.publication_status)}>{formatCatalogPublicationStatusLabel(publication.publication_status)}</Badge></TableCell>
                            <TableCell className="text-slate-300">{formatPublicationWindow(publication)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => openEditPublication(publication)}><Edit3 className="size-4" />Modifier</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </DataTableShell>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <Dialog open={titleDialogOpen} onOpenChange={setTitleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>{editingTitle ? "Modifier le titre" : "Créer un titre catalogue"}</DialogTitle>
            <DialogDescription>
              Le titre est l’actif éditorial racine du catalogue. Complétez l’identité, les
              métadonnées et les synopsis sans sortir du même panneau.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10.5rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-base text-white">Identité éditoriale</CardTitle>
                  <CardDescription>
                    Type, statut et nommage du contenu dans le catalogue tenant.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type de titre</Label>
                      <Select value={titleForm.title_type} onValueChange={(value) => setTitleForm((current) => ({ ...current, title_type: value as CatalogTitleType }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="movie">Film</SelectItem>
                          <SelectItem value="series">Série</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Statut éditorial</Label>
                      <Select value={titleForm.editorial_status} onValueChange={(value) => setTitleForm((current) => ({ ...current, editorial_status: value as CatalogEditorialStatus }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Brouillon</SelectItem>
                          <SelectItem value="ready">Prêt</SelectItem>
                          <SelectItem value="published">Publié</SelectItem>
                          <SelectItem value="archived">Archivé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                      value={titleForm.title}
                      onChange={(event) =>
                        setTitleForm((current) => {
                          const title = event.target.value;
                          return {
                            ...current,
                            title,
                            slug:
                              !editingTitle && (!current.slug || current.slug === slugifyCatalogValue(current.title))
                                ? slugifyCatalogValue(title)
                                : current.slug,
                          };
                        })
                      }
                      placeholder="Ex: Les héritiers du Nil"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input value={titleForm.slug} onChange={(event) => setTitleForm((current) => ({ ...current, slug: event.target.value }))} placeholder="les-heritiers-du-nil" />
                    </div>
                    <Button type="button" variant="outline" onClick={() => setTitleForm((current) => ({ ...current, slug: slugifyCatalogValue(current.title) }))}>
                      Générer
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Titre original</Label>
                    <Input value={titleForm.original_title} onChange={(event) => setTitleForm((current) => ({ ...current, original_title: event.target.value }))} placeholder="Original title" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-base text-white">Métadonnées de diffusion</CardTitle>
                  <CardDescription>
                    Informations utiles pour la vitrine, la recommandation et les exports partenaires.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Année de sortie</Label>
                    <Input value={titleForm.release_year} onChange={(event) => setTitleForm((current) => ({ ...current, release_year: event.target.value }))} placeholder="2026" inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Classification</Label>
                    <Input value={titleForm.maturity_rating} onChange={(event) => setTitleForm((current) => ({ ...current, maturity_rating: event.target.value }))} placeholder="Tout public, 12+, 16+..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Langue originale</Label>
                    <Input value={titleForm.original_language} onChange={(event) => setTitleForm((current) => ({ ...current, original_language: event.target.value }))} placeholder="fr, en, yor, sw" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays d’origine</Label>
                    <Input value={titleForm.country_of_origin} onChange={(event) => setTitleForm((current) => ({ ...current, country_of_origin: event.target.value }))} placeholder="Bénin, Côte d'Ivoire, Nigeria" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03] xl:col-span-2">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-base text-white">Synopsis et promesse éditoriale</CardTitle>
                  <CardDescription>
                    Résumé court pour les listes. Synopsis long pour la fiche.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Synopsis court</Label>
                    <Textarea value={titleForm.short_synopsis} onChange={(event) => setTitleForm((current) => ({ ...current, short_synopsis: event.target.value }))} placeholder="Pitch court pour les listes et vitrines." />
                  </div>
                  <div className="space-y-2">
                    <Label>Synopsis long</Label>
                    <Textarea value={titleForm.long_synopsis} onChange={(event) => setTitleForm((current) => ({ ...current, long_synopsis: event.target.value }))} placeholder="Résumé complet pour la fiche détail." className="min-h-36" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setTitleDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveTitle()} disabled={savingTitle}>
              {savingTitle ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingTitle ? "Enregistrer" : "Créer le titre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>{editingSeason ? "Modifier la saison" : "Créer une saison"}</DialogTitle>
            <DialogDescription>Organisation éditoriale de la série.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Numéro de saison</Label>
                <Input value={seasonForm.season_number} onChange={(event) => setSeasonForm((current) => ({ ...current, season_number: event.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Ordre d’affichage</Label>
                <Input value={seasonForm.sort_order} onChange={(event) => setSeasonForm((current) => ({ ...current, sort_order: event.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Titre éditorial</Label>
                <Input value={seasonForm.title} onChange={(event) => setSeasonForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Saison fondatrice" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Synopsis</Label>
                <Textarea value={seasonForm.synopsis} onChange={(event) => setSeasonForm((current) => ({ ...current, synopsis: event.target.value }))} placeholder="Résumé de saison." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Statut éditorial</Label>
                <Select value={seasonForm.editorial_status} onValueChange={(value) => setSeasonForm((current) => ({ ...current, editorial_status: value as CatalogEditorialStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="ready">Prêt</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setSeasonDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveSeason()} disabled={savingSeason}>
              {savingSeason ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingSeason ? "Enregistrer" : "Créer la saison"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>{editingEpisode ? "Modifier l’épisode" : "Créer un épisode"}</DialogTitle>
            <DialogDescription>Préparez la diffusion VOD épisode par épisode.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Saison</Label>
                <Select value={episodeForm.season_id || "none"} onValueChange={(value) => setEpisodeForm((current) => ({ ...current, season_id: value === "none" ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Hors saison</SelectItem>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.title ? `Saison ${season.season_number} · ${season.title}` : `Saison ${season.season_number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Numéro d’épisode</Label>
                <Input value={episodeForm.episode_number} onChange={(event) => setEpisodeForm((current) => ({ ...current, episode_number: event.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Titre</Label>
                <Input value={episodeForm.title} onChange={(event) => setEpisodeForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Le retour du témoin" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Synopsis</Label>
                <Textarea value={episodeForm.synopsis} onChange={(event) => setEpisodeForm((current) => ({ ...current, synopsis: event.target.value }))} placeholder="Résumé de l'épisode pour les fiches détail." />
              </div>
              <div className="space-y-2">
                <Label>Durée (secondes)</Label>
                <Input value={episodeForm.duration_sec} onChange={(event) => setEpisodeForm((current) => ({ ...current, duration_sec: event.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Date de sortie</Label>
                <Input type="date" value={episodeForm.release_date} onChange={(event) => setEpisodeForm((current) => ({ ...current, release_date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Ordre d’affichage</Label>
                <Input value={episodeForm.sort_order} onChange={(event) => setEpisodeForm((current) => ({ ...current, sort_order: event.target.value }))} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Statut éditorial</Label>
                <Select value={episodeForm.editorial_status} onValueChange={(value) => setEpisodeForm((current) => ({ ...current, editorial_status: value as CatalogEditorialStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="ready">Prêt</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setEpisodeDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveEpisode()} disabled={savingEpisode}>
              {savingEpisode ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingEpisode ? "Enregistrer" : "Créer l’épisode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mediaDialogOpen}
        onOpenChange={(open) => {
          setMediaDialogOpen(open);
          if (!open) setMediaAssetFile(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>
              {editingMediaAsset ? "Modifier le visuel" : "Ajouter un visuel"}
            </DialogTitle>
            <DialogDescription>
              Générez une vraie fiche OTT avec poster, miniature, backdrop et logo. Vous pouvez
              référencer une URL existante ou téléverser un asset image Oniix.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type de visuel</Label>
                    <Select
                      value={mediaAssetForm.asset_type}
                      onValueChange={(value) =>
                        setMediaAssetForm((current) => ({
                          ...current,
                          asset_type: value as CatalogMediaAssetType,
                        }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poster">Poster</SelectItem>
                        <SelectItem value="thumbnail">Miniature</SelectItem>
                        <SelectItem value="backdrop">Backdrop</SelectItem>
                        <SelectItem value="logo">Logo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ordre</Label>
                    <Input
                      value={mediaAssetForm.sort_order}
                      onChange={(event) =>
                        setMediaAssetForm((current) => ({
                          ...current,
                          sort_order: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>URL du visuel</Label>
                  <Input
                    value={mediaAssetForm.source_url}
                    onChange={(event) =>
                      setMediaAssetForm((current) => ({
                        ...current,
                        source_url: event.target.value,
                      }))
                    }
                    placeholder="https://cdn.example.com/poster.jpg"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Accepte une URL externe ou une référence de stockage Oniix.
                  </p>
                </div>

                <div className="space-y-2 rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-2.5 text-slate-300">
                      <Upload className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">Téléverser un visuel</div>
                      <p className="text-xs leading-5 text-slate-500">
                        Oniix stocke ensuite le visuel et l’associe au titre. Recommandé pour les posters et backdrops.
                      </p>
                    </div>
                  </div>
                  <Input
                    className="mt-4"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
                    onChange={(event) => setMediaAssetFile(event.target.files?.[0] ?? null)}
                  />
                  {mediaAssetFile ? (
                    <p className="text-xs text-slate-400">Fichier sélectionné: {mediaAssetFile.name}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Texte alternatif</Label>
                    <Input
                      value={mediaAssetForm.alt_text}
                      onChange={(event) =>
                        setMediaAssetForm((current) => ({
                          ...current,
                          alt_text: event.target.value,
                        }))
                      }
                      placeholder="Poster officiel du titre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Locale</Label>
                    <Input
                      value={mediaAssetForm.locale}
                      onChange={(event) =>
                        setMediaAssetForm((current) => ({
                          ...current,
                          locale: event.target.value,
                        }))
                      }
                      placeholder="fr-BJ, en-US..."
                    />
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden border-white/10 bg-white/[0.03]">
                <div className="relative aspect-[3/4] overflow-hidden border-b border-white/10 bg-black/20">
                  {(mediaAssetPreviewUrl ?? resolveCatalogMediaUrl(mediaAssetForm.source_url)) ? (
                    <Image
                      src={mediaAssetPreviewUrl ?? resolveCatalogMediaUrl(mediaAssetForm.source_url) ?? ""}
                      alt={mediaAssetForm.alt_text || selectedTitle?.title || "Visuel"}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 320px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <ImageIcon className="size-9" />
                    </div>
                  )}
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {formatCatalogMediaAssetTypeLabel(mediaAssetForm.asset_type)}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">
                      Prévisualisation de la vignette catalogue actuelle.
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-400">
                    {mediaAssetFile
                      ? `Upload prêt: ${mediaAssetFile.name}`
                      : mediaAssetForm.source_url.trim()
                      ? formatOriginHost(mediaAssetForm.source_url.trim())
                      : "Aucune source rattachée pour le moment."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setMediaDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void onSaveMediaAsset()} disabled={savingMediaAsset}>
              {savingMediaAsset ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingMediaAsset ? "Enregistrer" : "Ajouter le visuel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={playbackSourceDialogOpen}
        onOpenChange={(open) => {
          setPlaybackSourceDialogOpen(open);
          if (!open) setPlaybackSourceFile(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>
              {editingPlaybackSource ? "Modifier la source" : "Ajouter une source de lecture"}
            </DialogTitle>
            <DialogDescription>
              Rattachez une URL HLS, DASH ou fichier direct au film ou à un épisode.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Cible de lecture</Label>
              <Select
                value={`${playbackSourceForm.playable_type}:${playbackSourceForm.playable_id}`}
                onValueChange={(value) => {
                  const [playableType, playableId] = value.split(":");
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    playable_type: playableType as CatalogPlaybackPlayableType,
                    playable_id: playableId,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un film ou un épisode" />
                </SelectTrigger>
                <SelectContent>
                  {playbackSourceTargets.map((target) => (
                    <SelectItem
                      key={`${target.playable_type}:${target.playable_id}`}
                      value={`${target.playable_type}:${target.playable_id}`}
                    >
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format source</Label>
              <Select
                value={playbackSourceForm.source_kind}
                onValueChange={(value) =>
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    source_kind: value as CatalogSourceKind,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hls">HLS</SelectItem>
                  <SelectItem value="dash">MPEG-DASH</SelectItem>
                  <SelectItem value="file">Fichier direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode de distribution</Label>
              <Select
                value={playbackSourceForm.delivery_mode}
                onValueChange={(value) =>
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    delivery_mode: value as CatalogDeliveryMode,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gateway">Gateway Oniix</SelectItem>
                  <SelectItem value="direct">Lecture directe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>URL source</Label>
              <Input
                value={playbackSourceForm.origin_url}
                onChange={(event) =>
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    origin_url: event.target.value,
                  }))
                }
                placeholder="https://origin.example.com/movie/master.m3u8"
              />
              <p className="text-xs text-slate-500">
                Utilisez une URL pour HLS ou DASH. Pour un fichier vidéo unitaire, utilisez
                le module upload ci-dessous.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Fichier vidéo</Label>
              <Input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                onChange={(event) =>
                  setPlaybackSourceFile(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-slate-500">
                Le module upload direct crée une source de type fichier dans le stockage
                Oniix.
              </p>
              {playbackSourceFile ? (
                <p className="text-xs text-slate-400">
                  Fichier sélectionné: {playbackSourceFile.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Durée estimée (secondes)</Label>
              <Input
                value={playbackSourceForm.duration_sec}
                onChange={(event) =>
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    duration_sec: event.target.value,
                  }))
                }
                inputMode="numeric"
                placeholder="5400"
              />
            </div>
            <div className="space-y-2">
              <Label>Statut source</Label>
              <Select
                value={playbackSourceForm.source_status}
                onValueChange={(value) =>
                  setPlaybackSourceForm((current) => ({
                    ...current,
                    source_status: value as CatalogSourceStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="ready">Prêt</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPlaybackSourceDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => void onSavePlaybackSource()}
              disabled={savingPlaybackSource}
            >
              {savingPlaybackSource ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {editingPlaybackSource ? "Enregistrer" : "Ajouter la source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publicationDialogOpen} onOpenChange={setPublicationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 pb-4 pt-6">
            <DialogTitle>{editingPublication ? "Modifier la publication" : "Créer une publication"}</DialogTitle>
            <DialogDescription>Pilotez la cible publiée, la visibilité, la fenêtre et la vitrine de distribution.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(88vh-10rem)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Contenu publié</Label>
              <Select
                value={`${publicationForm.playable_type}:${publicationForm.playable_id}`}
                onValueChange={(value) => {
                  const [playableType, playableId] = value.split(":");
                  setPublicationForm((current) => ({ ...current, playable_type: playableType as CatalogPlayableType, playable_id: playableId }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choisir une cible" /></SelectTrigger>
                <SelectContent>
                  {publicationTargets.map((target) => (
                    <SelectItem key={`${target.playable_type}:${target.playable_id}`} value={`${target.playable_type}:${target.playable_id}`}>
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Storefront</Label>
              <Input value={publicationForm.storefront} onChange={(event) => setPublicationForm((current) => ({ ...current, storefront: event.target.value }))} placeholder="mobile-app" />
            </div>
            <div className="space-y-2">
              <Label>Rang éditorial</Label>
              <Input value={publicationForm.featured_rank} onChange={(event) => setPublicationForm((current) => ({ ...current, featured_rank: event.target.value }))} inputMode="numeric" placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Visibilité</Label>
              <Select value={publicationForm.visibility} onValueChange={(value) => setPublicationForm((current) => ({ ...current, visibility: value as CatalogVisibility }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privé</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Non listé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut de publication</Label>
              <Select value={publicationForm.publication_status} onValueChange={(value) => setPublicationForm((current) => ({ ...current, publication_status: value as CatalogPublicationStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="scheduled">Planifié</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disponible à partir du</Label>
              <Input type="datetime-local" value={publicationForm.available_from} onChange={(event) => setPublicationForm((current) => ({ ...current, available_from: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Disponible jusqu’au</Label>
              <Input type="datetime-local" value={publicationForm.available_to} onChange={(event) => setPublicationForm((current) => ({ ...current, available_to: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date de publication effective</Label>
              <Input type="datetime-local" value={publicationForm.published_at} onChange={(event) => setPublicationForm((current) => ({ ...current, published_at: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pays autorisés</Label>
              <Input value={publicationForm.geo_allow} onChange={(event) => setPublicationForm((current) => ({ ...current, geo_allow: event.target.value }))} placeholder="BJ, CI, TG" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Pays bloqués</Label>
              <Input value={publicationForm.geo_block} onChange={(event) => setPublicationForm((current) => ({ ...current, geo_block: event.target.value }))} placeholder="FR, US" />
            </div>
          </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 pb-6 pt-4">
            <Button type="button" variant="outline" onClick={() => setPublicationDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSavePublication()} disabled={savingPublication}>
              {savingPublication ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingPublication ? "Enregistrer" : "Créer la publication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
