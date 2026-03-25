export const CATALOG_TITLE_TYPES = ["movie", "series"] as const;
export type CatalogTitleType = (typeof CATALOG_TITLE_TYPES)[number];

export const CATALOG_EDITORIAL_STATUSES = [
  "draft",
  "ready",
  "published",
  "archived",
] as const;
export type CatalogEditorialStatus = (typeof CATALOG_EDITORIAL_STATUSES)[number];

export const CATALOG_PUBLICATION_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;
export type CatalogPublicationStatus = (typeof CATALOG_PUBLICATION_STATUSES)[number];

export const CATALOG_VISIBILITIES = ["private", "public", "unlisted"] as const;
export type CatalogVisibility = (typeof CATALOG_VISIBILITIES)[number];

export const CATALOG_PLAYABLE_TYPES = [
  "movie",
  "series",
  "season",
  "episode",
] as const;
export type CatalogPlayableType = (typeof CATALOG_PLAYABLE_TYPES)[number];

export const CATALOG_PLAYBACK_PLAYABLE_TYPES = ["movie", "episode"] as const;
export type CatalogPlaybackPlayableType =
  (typeof CATALOG_PLAYBACK_PLAYABLE_TYPES)[number];

export const CATALOG_SOURCE_KINDS = ["hls", "dash", "file"] as const;
export type CatalogSourceKind = (typeof CATALOG_SOURCE_KINDS)[number];

export const CATALOG_DELIVERY_MODES = ["gateway", "direct"] as const;
export type CatalogDeliveryMode = (typeof CATALOG_DELIVERY_MODES)[number];

export const CATALOG_SOURCE_STATUSES = [
  "draft",
  "ready",
  "published",
  "archived",
] as const;
export type CatalogSourceStatus = (typeof CATALOG_SOURCE_STATUSES)[number];

export const CATALOG_PLAYBACK_UPLOAD_BUCKET = "catalog-vod-sources";
export const CATALOG_MEDIA_UPLOAD_BUCKET = "catalog-vod-media";

export const CATALOG_MEDIA_OWNER_TYPES = ["title", "season", "episode"] as const;
export type CatalogMediaOwnerType = (typeof CATALOG_MEDIA_OWNER_TYPES)[number];

export const CATALOG_MEDIA_ASSET_TYPES = [
  "poster",
  "backdrop",
  "thumbnail",
  "logo",
  "trailer",
] as const;
export type CatalogMediaAssetType = (typeof CATALOG_MEDIA_ASSET_TYPES)[number];

export type CatalogTitle = {
  id: string;
  tenant_id: string;
  title_type: CatalogTitleType;
  slug: string;
  title: string;
  original_title: string | null;
  short_synopsis: string | null;
  long_synopsis: string | null;
  release_year: number | null;
  maturity_rating: string | null;
  original_language: string | null;
  country_of_origin: string[];
  editorial_status: CatalogEditorialStatus;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogSeason = {
  id: string;
  tenant_id: string;
  series_id: string;
  season_number: number;
  title: string | null;
  synopsis: string | null;
  editorial_status: CatalogEditorialStatus;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogEpisode = {
  id: string;
  tenant_id: string;
  series_id: string;
  season_id: string | null;
  episode_number: number;
  title: string;
  synopsis: string | null;
  duration_sec: number | null;
  release_date: string | null;
  editorial_status: CatalogEditorialStatus;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogPublication = {
  id: string;
  tenant_id: string;
  playable_type: CatalogPlayableType;
  playable_id: string;
  visibility: CatalogVisibility;
  publication_status: CatalogPublicationStatus;
  available_from: string | null;
  available_to: string | null;
  geo: { allow: string[]; block: string[] };
  storefront: string;
  featured_rank: number | null;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogPlaybackSource = {
  id: string;
  tenant_id: string;
  playable_type: CatalogPlaybackPlayableType;
  playable_id: string;
  source_kind: CatalogSourceKind;
  delivery_mode: CatalogDeliveryMode;
  origin_url: string;
  duration_sec: number | null;
  drm: Record<string, unknown>;
  audio_tracks: Array<Record<string, unknown>>;
  subtitle_tracks: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  source_status: CatalogSourceStatus;
  created_at: string;
  updated_at: string;
};

export type CatalogMediaAsset = {
  id: string;
  tenant_id: string;
  owner_type: CatalogMediaOwnerType;
  owner_id: string;
  asset_type: CatalogMediaAssetType;
  storage_provider: string | null;
  source_url: string;
  alt_text: string | null;
  locale: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function slugifyCatalogValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function formatCatalogTitleTypeLabel(value: string | null | undefined) {
  if (value === "movie") return "Film";
  if (value === "series") return "S\u00E9rie";
  return "Titre";
}

export function formatCatalogStatusLabel(value: string | null | undefined) {
  if (value === "draft") return "Brouillon";
  if (value === "ready") return "Pr\u00EAt";
  if (value === "published") return "Publi\u00E9";
  if (value === "archived") return "Archiv\u00E9";
  return "Inconnu";
}

export function formatCatalogVisibilityLabel(value: string | null | undefined) {
  if (value === "public") return "Public";
  if (value === "unlisted") return "Non list\u00E9";
  return "Priv\u00E9";
}

export function formatCatalogPublicationStatusLabel(value: string | null | undefined) {
  if (value === "scheduled") return "Planifi\u00E9";
  return formatCatalogStatusLabel(value);
}

export function formatCatalogSourceKindLabel(value: string | null | undefined) {
  if (value === "dash") return "MPEG-DASH";
  if (value === "file") return "Fichier";
  return "HLS";
}

export function formatCatalogDeliveryModeLabel(value: string | null | undefined) {
  if (value === "direct") return "Direct";
  return "Gateway";
}

export function formatCatalogMediaAssetTypeLabel(value: string | null | undefined) {
  if (value === "backdrop") return "Backdrop";
  if (value === "thumbnail") return "Miniature";
  if (value === "logo") return "Logo";
  if (value === "trailer") return "Trailer";
  return "Poster";
}
