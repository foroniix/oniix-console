"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clapperboard,
  Edit3,
  Film,
  FolderKanban,
  Globe2,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
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
  formatCatalogPublicationStatusLabel,
  formatCatalogSourceKindLabel,
  formatCatalogStatusLabel,
  formatCatalogTitleTypeLabel,
  formatCatalogVisibilityLabel,
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
      const { response, payload } = await readJson<CatalogTitlesResponse>("/api/catalog/titles");
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Impossible de charger le catalogue.");
      }
      setTitles(Array.isArray(payload.titles) ? payload.titles : []);
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
        subtitle="Pilotez vos films, séries, saisons, épisodes et publications VOD dans un module distinct du live TV et du replay."
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <div className="space-y-6">
          <FilterBar onReset={resetFilters} resetDisabled={!query && typeFilter === "all" && statusFilter === "all"}>
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par titre, slug ou titre original" className="pl-11" />
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
            emptyDescription="Commencez par créer vos premiers films ou séries avant d'ouvrir les saisons, épisodes et publications."
            emptyAction={<Button onClick={openCreateTitle}><Plus className="size-4" />Créer un titre</Button>}
          >
            <div className="divide-y divide-white/10">
              {filteredTitles.map((item) => {
                const selected = item.id === selectedTitleId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedTitleId(item.id)}
                    className={`flex w-full flex-col gap-3 px-5 py-4 text-left transition ${selected ? "bg-[var(--brand-primary)]/10 ring-1 ring-inset ring-[var(--brand-primary)]/25" : "hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">/{item.slug}{item.original_title ? ` · ${item.original_title}` : ""}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{formatCatalogTitleTypeLabel(item.title_type)}</Badge>
                        <Badge className={badgeClassForEditorial(item.editorial_status)}>{formatCatalogStatusLabel(item.editorial_status)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Année: {item.release_year ?? "--"}</span>
                      <span>Langue: {(item.original_language ?? "").trim() || "--"}</span>
                      <span>Mis à jour: {formatUpdatedAt(item.updated_at)}</span>
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
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatCatalogTitleTypeLabel(selectedTitle.title_type)}</Badge>
                      <Badge className={badgeClassForEditorial(selectedTitle.editorial_status)}>
                        {formatCatalogStatusLabel(selectedTitle.editorial_status)}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">{selectedTitle.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-6 text-slate-300">
                        {selectedTitle.short_synopsis || "Ajoutez un résumé éditorial court pour alimenter le catalogue, le mobile et les vitrines partenaires."}
                      </CardDescription>
                    </div>
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
              <TabsList className="mb-5">
                <TabsTrigger value="editorial">Fiche éditoriale</TabsTrigger>
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
                    description="Structurez la série avant la publication détaillée."
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
                    description="Préparez la diffusion VOD épisode par épisode."
                    loading={workspaceLoading}
                    error={workspaceError}
                    onRetry={() => void loadWorkspace(selectedTitle, false)}
                    isEmpty={!workspaceLoading && !workspaceError && episodes.length === 0}
                    emptyTitle="Aucun épisode"
                    emptyDescription="Ajoutez vos premiers épisodes pour ouvrir la publication détaillée."
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

              <TabsContent value="sources" className="space-y-6">
                <DataTableShell
                  title="Sources de lecture"
                  description="Rattachez un flux HLS, DASH ou un fichier direct à un film ou à un épisode."
                  loading={workspaceLoading}
                  error={workspaceError}
                  onRetry={() => void loadWorkspace(selectedTitle, false)}
                  isEmpty={!workspaceLoading && !workspaceError && relatedPlaybackSources.length === 0}
                  emptyTitle="Aucune source de lecture"
                  emptyDescription="Ajoutez une URL source pour préparer le playback VOD sur le mobile et les futures vitrines."
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
                  description="Pilotez la visibilité, la fenêtre et la vitrine de distribution."
                  loading={workspaceLoading}
                  error={workspaceError}
                  onRetry={() => void loadWorkspace(selectedTitle, false)}
                  isEmpty={!workspaceLoading && !workspaceError && relatedPublications.length === 0}
                  emptyTitle="Aucune publication"
                  emptyDescription="Créez une première publication pour exposer ce contenu dans l'application mobile ou une vitrine partenaire."
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingTitle ? "Modifier le titre" : "Créer un titre catalogue"}</DialogTitle>
            <DialogDescription>Le titre est l’actif éditorial racine du catalogue.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
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
            <div className="space-y-2 md:col-span-2">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Slug</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setTitleForm((current) => ({ ...current, slug: slugifyCatalogValue(current.title) }))}>Générer</Button>
              </div>
              <Input value={titleForm.slug} onChange={(event) => setTitleForm((current) => ({ ...current, slug: event.target.value }))} placeholder="les-heritiers-du-nil" />
            </div>
            <div className="space-y-2">
              <Label>Titre original</Label>
              <Input value={titleForm.original_title} onChange={(event) => setTitleForm((current) => ({ ...current, original_title: event.target.value }))} placeholder="Original title" />
            </div>
            <div className="space-y-2">
              <Label>Année de sortie</Label>
              <Input value={titleForm.release_year} onChange={(event) => setTitleForm((current) => ({ ...current, release_year: event.target.value }))} placeholder="2026" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Langue originale</Label>
              <Input value={titleForm.original_language} onChange={(event) => setTitleForm((current) => ({ ...current, original_language: event.target.value }))} placeholder="fr, en, yor, sw" />
            </div>
            <div className="space-y-2">
              <Label>Pays d’origine</Label>
              <Input value={titleForm.country_of_origin} onChange={(event) => setTitleForm((current) => ({ ...current, country_of_origin: event.target.value }))} placeholder="Bénin, Côte d'Ivoire, Nigeria" />
            </div>
            <div className="space-y-2">
              <Label>Classification</Label>
              <Input value={titleForm.maturity_rating} onChange={(event) => setTitleForm((current) => ({ ...current, maturity_rating: event.target.value }))} placeholder="Tout public, 12+, 16+..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Synopsis court</Label>
              <Textarea value={titleForm.short_synopsis} onChange={(event) => setTitleForm((current) => ({ ...current, short_synopsis: event.target.value }))} placeholder="Pitch court pour les listes et vitrines." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Synopsis long</Label>
              <Textarea value={titleForm.long_synopsis} onChange={(event) => setTitleForm((current) => ({ ...current, long_synopsis: event.target.value }))} placeholder="Résumé complet pour la fiche détail." className="min-h-32" />
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 pt-4">
            <Button type="button" variant="outline" onClick={() => setTitleDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveTitle()} disabled={savingTitle}>
              {savingTitle ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingTitle ? "Enregistrer" : "Créer le titre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSeason ? "Modifier la saison" : "Créer une saison"}</DialogTitle>
            <DialogDescription>Structurez la série avant la publication détaillée.</DialogDescription>
          </DialogHeader>
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
              <Textarea value={seasonForm.synopsis} onChange={(event) => setSeasonForm((current) => ({ ...current, synopsis: event.target.value }))} placeholder="Résumé saisonnier pour les pages détail." />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSeasonDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveSeason()} disabled={savingSeason}>
              {savingSeason ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingSeason ? "Enregistrer" : "Créer la saison"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingEpisode ? "Modifier l’épisode" : "Créer un épisode"}</DialogTitle>
            <DialogDescription>Préparez la diffusion VOD épisode par épisode.</DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEpisodeDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={() => void onSaveEpisode()} disabled={savingEpisode}>
              {savingEpisode ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingEpisode ? "Enregistrer" : "Créer l’épisode"}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlaybackSource ? "Modifier la source" : "Ajouter une source de lecture"}
            </DialogTitle>
            <DialogDescription>
              Rattachez une URL HLS, DASH ou fichier direct au film ou à un épisode.
            </DialogDescription>
          </DialogHeader>
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
                Utilisez une URL pour HLS ou DASH. Pour un fichier video unitaire, utilisez
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
                Le module upload direct cree une source de type fichier dans le stockage
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
          <DialogFooter>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPublication ? "Modifier la publication" : "Créer une publication"}</DialogTitle>
            <DialogDescription>Pilotez la cible publiée, la visibilité, la fenêtre et la vitrine de distribution.</DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
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
