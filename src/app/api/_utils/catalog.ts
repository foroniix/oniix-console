import { NextResponse } from "next/server";
import { z } from "zod";

import {
  type CatalogDeliveryMode,
  type CatalogEditorialStatus,
  type CatalogEpisode,
  type CatalogMediaAsset,
  type CatalogMediaAssetType,
  type CatalogMediaOwnerType,
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
  CATALOG_DELIVERY_MODES,
  CATALOG_EDITORIAL_STATUSES,
  CATALOG_MEDIA_ASSET_TYPES,
  CATALOG_MEDIA_OWNER_TYPES,
  CATALOG_PLAYBACK_PLAYABLE_TYPES,
  CATALOG_PLAYABLE_TYPES,
  CATALOG_PUBLICATION_STATUSES,
  CATALOG_SOURCE_KINDS,
  CATALOG_SOURCE_STATUSES,
  CATALOG_TITLE_TYPES,
  CATALOG_VISIBILITIES,
  slugifyCatalogValue,
} from "@/lib/catalog";

const TITLE_TYPE_ENUM = z.enum(CATALOG_TITLE_TYPES);
const EDITORIAL_STATUS_ENUM = z.enum(CATALOG_EDITORIAL_STATUSES);
const PUBLICATION_STATUS_ENUM = z.enum(CATALOG_PUBLICATION_STATUSES);
const PLAYABLE_TYPE_ENUM = z.enum(CATALOG_PLAYABLE_TYPES);
const VISIBILITY_ENUM = z.enum(CATALOG_VISIBILITIES);
const PLAYBACK_PLAYABLE_TYPE_ENUM = z.enum(CATALOG_PLAYBACK_PLAYABLE_TYPES);
const SOURCE_KIND_ENUM = z.enum(CATALOG_SOURCE_KINDS);
const DELIVERY_MODE_ENUM = z.enum(CATALOG_DELIVERY_MODES);
const SOURCE_STATUS_ENUM = z.enum(CATALOG_SOURCE_STATUSES);
const MEDIA_OWNER_TYPE_ENUM = z.enum(CATALOG_MEDIA_OWNER_TYPES);
const MEDIA_ASSET_TYPE_ENUM = z.enum(CATALOG_MEDIA_ASSET_TYPES);

export const CATALOG_TITLE_SELECT =
  "id,tenant_id,title_type,slug,title,original_title,short_synopsis,long_synopsis,release_year,maturity_rating,original_language,country_of_origin,editorial_status,metadata,created_by,updated_by,created_at,updated_at";

export const CATALOG_SEASON_SELECT =
  "id,tenant_id,series_id,season_number,title,synopsis,editorial_status,sort_order,metadata,created_by,updated_by,created_at,updated_at";

export const CATALOG_EPISODE_SELECT =
  "id,tenant_id,series_id,season_id,episode_number,title,synopsis,duration_sec,release_date,editorial_status,sort_order,metadata,created_by,updated_by,created_at,updated_at";

export const CATALOG_PUBLICATION_SELECT =
  "id,tenant_id,playable_type,playable_id,visibility,publication_status,available_from,available_to,geo,storefront,featured_rank,published_at,created_by,updated_by,created_at,updated_at";

export const CATALOG_PLAYBACK_SOURCE_SELECT =
  "id,tenant_id,playable_type,playable_id,source_kind,delivery_mode,origin_url,duration_sec,drm,audio_tracks,subtitle_tracks,metadata,source_status,created_at,updated_at";

export const CATALOG_MEDIA_ASSET_SELECT =
  "id,tenant_id,owner_type,owner_id,asset_type,storage_provider,source_url,alt_text,locale,sort_order,metadata,created_at,updated_at";

export const catalogTitleCreateSchema = z.object({
  title_type: TITLE_TYPE_ENUM,
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(120).optional(),
  original_title: z.string().trim().max(160).nullable().optional(),
  short_synopsis: z.string().trim().max(320).nullable().optional(),
  long_synopsis: z.string().trim().max(4000).nullable().optional(),
  release_year: z.number().int().min(1900).max(2100).nullable().optional(),
  maturity_rating: z.string().trim().max(48).nullable().optional(),
  original_language: z.string().trim().max(16).nullable().optional(),
  country_of_origin: z.array(z.string().trim().min(2).max(64)).max(12).optional(),
  editorial_status: EDITORIAL_STATUS_ENUM.optional(),
});

export const catalogTitleUpdateSchema = catalogTitleCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "empty_update"
);

export const catalogSeasonCreateSchema = z.object({
  series_id: z.string().uuid(),
  season_number: z.number().int().min(1).max(999),
  title: z.string().trim().max(160).nullable().optional(),
  synopsis: z.string().trim().max(4000).nullable().optional(),
  editorial_status: EDITORIAL_STATUS_ENUM.optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const catalogSeasonUpdateSchema = catalogSeasonCreateSchema
  .omit({ series_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "empty_update");

export const catalogEpisodeCreateSchema = z.object({
  series_id: z.string().uuid(),
  season_id: z.string().uuid().nullable().optional(),
  episode_number: z.number().int().min(1).max(99999),
  title: z.string().trim().min(1).max(160),
  synopsis: z.string().trim().max(4000).nullable().optional(),
  duration_sec: z.number().int().min(1).max(172800).nullable().optional(),
  release_date: z.string().date().nullable().optional(),
  editorial_status: EDITORIAL_STATUS_ENUM.optional(),
  sort_order: z.number().int().min(0).max(99999).optional(),
});

export const catalogEpisodeUpdateSchema = catalogEpisodeCreateSchema
  .omit({ series_id: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "empty_update");

const geoSchema = z
  .object({
    allow: z.array(z.string().trim().min(2).max(8)).optional(),
    block: z.array(z.string().trim().min(2).max(8)).optional(),
  })
  .optional();

export const catalogPublicationCreateSchema = z.object({
  playable_type: PLAYABLE_TYPE_ENUM,
  playable_id: z.string().uuid(),
  visibility: VISIBILITY_ENUM.optional(),
  publication_status: PUBLICATION_STATUS_ENUM.optional(),
  available_from: z.string().datetime().nullable().optional(),
  available_to: z.string().datetime().nullable().optional(),
  geo: geoSchema,
  storefront: z.string().trim().min(1).max(64).optional(),
  featured_rank: z.number().int().min(0).max(99999).nullable().optional(),
  published_at: z.string().datetime().nullable().optional(),
});

export const catalogPublicationUpdateSchema = catalogPublicationCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "empty_update");

export const catalogPlaybackSourceCreateSchema = z.object({
  playable_type: PLAYBACK_PLAYABLE_TYPE_ENUM,
  playable_id: z.string().uuid(),
  source_kind: SOURCE_KIND_ENUM,
  delivery_mode: DELIVERY_MODE_ENUM.optional(),
  origin_url: z
    .string()
    .trim()
    .max(2048)
    .refine(isCatalogOriginReference, "origin_url"),
  duration_sec: z.number().int().min(1).max(172800).nullable().optional(),
  source_status: SOURCE_STATUS_ENUM.optional(),
});

export const catalogPlaybackSourceUpdateSchema = catalogPlaybackSourceCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "empty_update");

export const catalogMediaAssetCreateSchema = z.object({
  owner_type: MEDIA_OWNER_TYPE_ENUM,
  owner_id: z.string().uuid(),
  asset_type: MEDIA_ASSET_TYPE_ENUM,
  source_url: z.string().trim().max(2048).refine(isCatalogOriginReference, "source_url"),
  storage_provider: z.string().trim().max(64).nullable().optional(),
  alt_text: z.string().trim().max(240).nullable().optional(),
  locale: z.string().trim().max(16).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const catalogMediaAssetUpdateSchema = catalogMediaAssetCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "empty_update");

export function buildCatalogTitleInsert(
  input: z.infer<typeof catalogTitleCreateSchema>,
  tenantId: string,
  userId: string
) {
  const normalizedTitle = input.title.trim();
  const slugInput = input.slug?.trim() || normalizedTitle;

  return {
    tenant_id: tenantId,
    title_type: input.title_type,
    slug: slugifyCatalogValue(slugInput),
    title: normalizedTitle,
    original_title: normalizeNullableText(input.original_title),
    short_synopsis: normalizeNullableText(input.short_synopsis),
    long_synopsis: normalizeNullableText(input.long_synopsis),
    release_year: input.release_year ?? null,
    maturity_rating: normalizeNullableText(input.maturity_rating),
    original_language: normalizeNullableText(input.original_language),
    country_of_origin: input.country_of_origin ?? [],
    editorial_status: input.editorial_status ?? "draft",
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };
}

export function buildCatalogTitleUpdate(
  input: z.infer<typeof catalogTitleUpdateSchema>,
  current: CatalogTitle,
  userId: string
) {
  const nextTitle = input.title?.trim() ?? current.title;
  const nextSlugSource =
    input.slug !== undefined ? input.slug?.trim() || nextTitle : current.slug;

  return {
    title_type: (input.title_type ?? current.title_type) as CatalogTitleType,
    slug: slugifyCatalogValue(nextSlugSource),
    title: nextTitle,
    original_title:
      input.original_title !== undefined
        ? normalizeNullableText(input.original_title)
        : current.original_title,
    short_synopsis:
      input.short_synopsis !== undefined
        ? normalizeNullableText(input.short_synopsis)
        : current.short_synopsis,
    long_synopsis:
      input.long_synopsis !== undefined
        ? normalizeNullableText(input.long_synopsis)
        : current.long_synopsis,
    release_year:
      input.release_year !== undefined ? input.release_year : current.release_year,
    maturity_rating:
      input.maturity_rating !== undefined
        ? normalizeNullableText(input.maturity_rating)
        : current.maturity_rating,
    original_language:
      input.original_language !== undefined
        ? normalizeNullableText(input.original_language)
        : current.original_language,
    country_of_origin:
      input.country_of_origin !== undefined
        ? input.country_of_origin
        : current.country_of_origin,
    editorial_status:
      (input.editorial_status ?? current.editorial_status) as CatalogEditorialStatus,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
}

export function buildCatalogSeasonInsert(
  input: z.infer<typeof catalogSeasonCreateSchema>,
  tenantId: string,
  userId: string
) {
  return {
    tenant_id: tenantId,
    series_id: input.series_id,
    season_number: input.season_number,
    title: normalizeNullableText(input.title),
    synopsis: normalizeNullableText(input.synopsis),
    editorial_status: input.editorial_status ?? "draft",
    sort_order: input.sort_order ?? input.season_number,
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };
}

export function buildCatalogSeasonUpdate(
  input: z.infer<typeof catalogSeasonUpdateSchema>,
  current: CatalogSeason,
  userId: string
) {
  return {
    season_number:
      input.season_number !== undefined ? input.season_number : current.season_number,
    title: input.title !== undefined ? normalizeNullableText(input.title) : current.title,
    synopsis:
      input.synopsis !== undefined ? normalizeNullableText(input.synopsis) : current.synopsis,
    editorial_status:
      (input.editorial_status ?? current.editorial_status) as CatalogEditorialStatus,
    sort_order: input.sort_order !== undefined ? input.sort_order : current.sort_order,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
}

export function buildCatalogEpisodeInsert(
  input: z.infer<typeof catalogEpisodeCreateSchema>,
  tenantId: string,
  userId: string
) {
  return {
    tenant_id: tenantId,
    series_id: input.series_id,
    season_id: input.season_id ?? null,
    episode_number: input.episode_number,
    title: input.title.trim(),
    synopsis: normalizeNullableText(input.synopsis),
    duration_sec: input.duration_sec ?? null,
    release_date: input.release_date ?? null,
    editorial_status: input.editorial_status ?? "draft",
    sort_order: input.sort_order ?? input.episode_number,
    metadata: {},
    created_by: userId,
    updated_by: userId,
  };
}

export function buildCatalogEpisodeUpdate(
  input: z.infer<typeof catalogEpisodeUpdateSchema>,
  current: CatalogEpisode,
  userId: string
) {
  return {
    season_id: input.season_id !== undefined ? input.season_id : current.season_id,
    episode_number:
      input.episode_number !== undefined ? input.episode_number : current.episode_number,
    title: input.title !== undefined ? input.title.trim() : current.title,
    synopsis:
      input.synopsis !== undefined ? normalizeNullableText(input.synopsis) : current.synopsis,
    duration_sec:
      input.duration_sec !== undefined ? input.duration_sec : current.duration_sec,
    release_date:
      input.release_date !== undefined ? input.release_date : current.release_date,
    editorial_status:
      (input.editorial_status ?? current.editorial_status) as CatalogEditorialStatus,
    sort_order: input.sort_order !== undefined ? input.sort_order : current.sort_order,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
}

export function buildCatalogPublicationInsert(
  input: z.infer<typeof catalogPublicationCreateSchema>,
  tenantId: string,
  userId: string
) {
  return {
    tenant_id: tenantId,
    playable_type: input.playable_type,
    playable_id: input.playable_id,
    visibility: input.visibility ?? "private",
    publication_status: input.publication_status ?? "draft",
    available_from: input.available_from ?? null,
    available_to: input.available_to ?? null,
    geo: normalizeGeo(input.geo),
    storefront: normalizeStorefront(input.storefront),
    featured_rank: input.featured_rank ?? null,
    published_at: input.published_at ?? null,
    created_by: userId,
    updated_by: userId,
  };
}

export function buildCatalogPublicationUpdate(
  input: z.infer<typeof catalogPublicationUpdateSchema>,
  current: CatalogPublication,
  userId: string
) {
  return {
    visibility: (input.visibility ?? current.visibility) as CatalogVisibility,
    publication_status:
      (input.publication_status ?? current.publication_status) as CatalogPublicationStatus,
    available_from:
      input.available_from !== undefined ? input.available_from : current.available_from,
    available_to:
      input.available_to !== undefined ? input.available_to : current.available_to,
    geo: input.geo !== undefined ? normalizeGeo(input.geo) : current.geo,
    storefront:
      input.storefront !== undefined
        ? normalizeStorefront(input.storefront)
        : current.storefront,
    featured_rank:
      input.featured_rank !== undefined ? input.featured_rank : current.featured_rank,
    published_at:
      input.published_at !== undefined ? input.published_at : current.published_at,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
}

export function buildCatalogPlaybackSourceInsert(
  input: z.infer<typeof catalogPlaybackSourceCreateSchema>,
  tenantId: string
) {
  return {
    tenant_id: tenantId,
    playable_type: input.playable_type,
    playable_id: input.playable_id,
    source_kind: input.source_kind,
    delivery_mode: input.delivery_mode ?? "gateway",
    origin_url: input.origin_url.trim(),
    duration_sec: input.duration_sec ?? null,
    drm: {},
    audio_tracks: [],
    subtitle_tracks: [],
    metadata: {},
    source_status: input.source_status ?? "draft",
  };
}

export function buildCatalogPlaybackSourceUpdate(
  input: z.infer<typeof catalogPlaybackSourceUpdateSchema>,
  current: CatalogPlaybackSource
) {
  return {
    playable_type:
      (input.playable_type ?? current.playable_type) as CatalogPlaybackPlayableType,
    playable_id: input.playable_id ?? current.playable_id,
    source_kind: (input.source_kind ?? current.source_kind) as CatalogSourceKind,
    delivery_mode:
      (input.delivery_mode ?? current.delivery_mode) as CatalogDeliveryMode,
    origin_url: input.origin_url !== undefined ? input.origin_url.trim() : current.origin_url,
    duration_sec:
      input.duration_sec !== undefined ? input.duration_sec : current.duration_sec,
    source_status:
      (input.source_status ?? current.source_status) as CatalogSourceStatus,
    updated_at: new Date().toISOString(),
  };
}

export function buildCatalogMediaAssetInsert(
  input: z.infer<typeof catalogMediaAssetCreateSchema>,
  tenantId: string
) {
  return {
    tenant_id: tenantId,
    owner_type: input.owner_type,
    owner_id: input.owner_id,
    asset_type: input.asset_type,
    storage_provider: normalizeNullableText(input.storage_provider),
    source_url: input.source_url.trim(),
    alt_text: normalizeNullableText(input.alt_text),
    locale: normalizeNullableText(input.locale),
    sort_order: input.sort_order ?? 0,
    metadata: {},
  };
}

export function buildCatalogMediaAssetUpdate(
  input: z.infer<typeof catalogMediaAssetUpdateSchema>,
  current: CatalogMediaAsset
) {
  return {
    owner_type: (input.owner_type ?? current.owner_type) as CatalogMediaOwnerType,
    owner_id: input.owner_id ?? current.owner_id,
    asset_type: (input.asset_type ?? current.asset_type) as CatalogMediaAssetType,
    storage_provider:
      input.storage_provider !== undefined
        ? normalizeNullableText(input.storage_provider)
        : current.storage_provider,
    source_url: input.source_url !== undefined ? input.source_url.trim() : current.source_url,
    alt_text:
      input.alt_text !== undefined ? normalizeNullableText(input.alt_text) : current.alt_text,
    locale: input.locale !== undefined ? normalizeNullableText(input.locale) : current.locale,
    sort_order: input.sort_order !== undefined ? input.sort_order : current.sort_order,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeCatalogTitleRow(row: Record<string, unknown>): CatalogTitle {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    title_type: normalizeTitleType(row.title_type),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    original_title: normalizeNullableValue(row.original_title),
    short_synopsis: normalizeNullableValue(row.short_synopsis),
    long_synopsis: normalizeNullableValue(row.long_synopsis),
    release_year: parseNullableNumber(row.release_year),
    maturity_rating: normalizeNullableValue(row.maturity_rating),
    original_language: normalizeNullableValue(row.original_language),
    country_of_origin: normalizeStringArray(row.country_of_origin),
    editorial_status: normalizeEditorialStatus(row.editorial_status),
    metadata: normalizeObject(row.metadata),
    created_by: normalizeNullableValue(row.created_by),
    updated_by: normalizeNullableValue(row.updated_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function normalizeCatalogSeasonRow(row: Record<string, unknown>): CatalogSeason {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    series_id: String(row.series_id ?? ""),
    season_number: Math.max(0, parseNumber(row.season_number)),
    title: normalizeNullableValue(row.title),
    synopsis: normalizeNullableValue(row.synopsis),
    editorial_status: normalizeEditorialStatus(row.editorial_status),
    sort_order: parseNumber(row.sort_order),
    metadata: normalizeObject(row.metadata),
    created_by: normalizeNullableValue(row.created_by),
    updated_by: normalizeNullableValue(row.updated_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function normalizeCatalogEpisodeRow(row: Record<string, unknown>): CatalogEpisode {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    series_id: String(row.series_id ?? ""),
    season_id: normalizeNullableValue(row.season_id),
    episode_number: Math.max(0, parseNumber(row.episode_number)),
    title: String(row.title ?? ""),
    synopsis: normalizeNullableValue(row.synopsis),
    duration_sec: parseNullableNumber(row.duration_sec),
    release_date: normalizeNullableValue(row.release_date),
    editorial_status: normalizeEditorialStatus(row.editorial_status),
    sort_order: parseNumber(row.sort_order),
    metadata: normalizeObject(row.metadata),
    created_by: normalizeNullableValue(row.created_by),
    updated_by: normalizeNullableValue(row.updated_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function normalizeCatalogPublicationRow(
  row: Record<string, unknown>
): CatalogPublication {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    playable_type: normalizePlayableType(row.playable_type),
    playable_id: String(row.playable_id ?? ""),
    visibility: normalizeVisibility(row.visibility),
    publication_status: normalizePublicationStatus(row.publication_status),
    available_from: normalizeNullableValue(row.available_from),
    available_to: normalizeNullableValue(row.available_to),
    geo: normalizeGeo(row.geo),
    storefront: normalizeStorefront(row.storefront),
    featured_rank: parseNullableNumber(row.featured_rank),
    published_at: normalizeNullableValue(row.published_at),
    created_by: normalizeNullableValue(row.created_by),
    updated_by: normalizeNullableValue(row.updated_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function normalizeCatalogPlaybackSourceRow(
  row: Record<string, unknown>
): CatalogPlaybackSource {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    playable_type: normalizePlaybackPlayableType(row.playable_type),
    playable_id: String(row.playable_id ?? ""),
    source_kind: normalizeSourceKind(row.source_kind),
    delivery_mode: normalizeDeliveryMode(row.delivery_mode),
    origin_url: String(row.origin_url ?? ""),
    duration_sec: parseNullableNumber(row.duration_sec),
    drm: normalizeObject(row.drm),
    audio_tracks: normalizeObjectArray(row.audio_tracks),
    subtitle_tracks: normalizeObjectArray(row.subtitle_tracks),
    metadata: normalizeObject(row.metadata),
    source_status: normalizeSourceStatus(row.source_status),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function normalizeCatalogMediaAssetRow(
  row: Record<string, unknown>
): CatalogMediaAsset {
  return {
    id: String(row.id ?? ""),
    tenant_id: String(row.tenant_id ?? ""),
    owner_type: normalizeMediaOwnerType(row.owner_type),
    owner_id: String(row.owner_id ?? ""),
    asset_type: normalizeMediaAssetType(row.asset_type),
    storage_provider: normalizeNullableValue(row.storage_provider),
    source_url: String(row.source_url ?? ""),
    alt_text: normalizeNullableValue(row.alt_text),
    locale: normalizeNullableValue(row.locale),
    sort_order: parseNumber(row.sort_order),
    metadata: normalizeObject(row.metadata),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export function isCatalogDomainMissing(
  error: { code?: string | null; message?: string | null } | null | undefined
) {
  const code = String(error?.code ?? "");
  if (code === "42P01" || code === "42703") return true;
  return (
    /catalog_/i.test(String(error?.message ?? "")) &&
    /does not exist|not exist|relation/i.test(String(error?.message ?? ""))
  );
}

export function isCatalogPolicyMissing(
  error: { code?: string | null; message?: string | null } | null | undefined
) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  if (code === "42501") return true;
  return /row-level security|violates row-level security|permission denied/i.test(message);
}

export function catalogDomainUnavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Domaine catalogue indisponible. Ex\u00E9cutez la migration Catalog/VOD dans Supabase avant d'utiliser ce module.",
    },
    { status: 503 }
  );
}

export function catalogPolicyUnavailableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Politiques RLS du catalogue absentes ou incompl\u00E8tes. Ex\u00E9cutez la migration Supabase 20260324131500_catalog_vod_foundation.sql.",
    },
    { status: 503 }
  );
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeObjectArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function normalizeGeo(value: unknown) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    allow: normalizeStringArray(source.allow),
    block: normalizeStringArray(source.block),
  };
}

function normalizeStorefront(value: unknown) {
  const normalized = String(value ?? "mobile-app").trim();
  return normalized.length > 0 ? normalized : "mobile-app";
}

function isCatalogOriginReference(value: string) {
  if (/^storage:\/\/[^/]+\/.+$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeTitleType(value: unknown): CatalogTitleType {
  return String(value ?? "").trim().toLowerCase() === "series" ? "series" : "movie";
}

function normalizeEditorialStatus(value: unknown): CatalogEditorialStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "ready") return "ready";
  if (normalized === "published") return "published";
  if (normalized === "archived") return "archived";
  return "draft";
}

function normalizePlayableType(value: unknown): CatalogPlayableType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "series") return "series";
  if (normalized === "season") return "season";
  if (normalized === "episode") return "episode";
  return "movie";
}

function normalizePlaybackPlayableType(value: unknown): CatalogPlaybackPlayableType {
  return String(value ?? "").trim().toLowerCase() === "episode" ? "episode" : "movie";
}

function normalizeVisibility(value: unknown): CatalogVisibility {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "public") return "public";
  if (normalized === "unlisted") return "unlisted";
  return "private";
}

function normalizePublicationStatus(value: unknown): CatalogPublicationStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "scheduled") return "scheduled";
  if (normalized === "published") return "published";
  if (normalized === "archived") return "archived";
  return "draft";
}

function normalizeSourceKind(value: unknown): CatalogSourceKind {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "dash") return "dash";
  if (normalized === "file") return "file";
  return "hls";
}

function normalizeDeliveryMode(value: unknown): CatalogDeliveryMode {
  return String(value ?? "").trim().toLowerCase() === "direct" ? "direct" : "gateway";
}

function normalizeSourceStatus(value: unknown): CatalogSourceStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "ready") return "ready";
  if (normalized === "published") return "published";
  if (normalized === "archived") return "archived";
  return "draft";
}

function normalizeMediaOwnerType(value: unknown): CatalogMediaOwnerType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "season") return "season";
  if (normalized === "episode") return "episode";
  return "title";
}

function normalizeMediaAssetType(value: unknown): CatalogMediaAssetType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "backdrop") return "backdrop";
  if (normalized === "thumbnail") return "thumbnail";
  if (normalized === "logo") return "logo";
  if (normalized === "trailer") return "trailer";
  return "poster";
}
