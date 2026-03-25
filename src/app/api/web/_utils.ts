import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CatalogMediaAsset,
  CatalogPlaybackSource,
  CatalogPublication,
  CatalogSourceStatus,
} from "@/lib/catalog";

export const WEB_PUBLIC_STOREFRONTS = new Set([
  "mobile-app",
  "web",
  "web-app",
  "public-web",
  "ott-web",
]);

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function encodeStoragePath(value: string) {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function parseStorageReference(value: string | null | undefined) {
  const normalized = clean(value);
  if (!normalized || !normalized.startsWith("storage://")) return null;

  const withoutScheme = normalized.slice("storage://".length);
  const separatorIndex = withoutScheme.indexOf("/");
  if (separatorIndex <= 0) return null;

  const bucket = withoutScheme.slice(0, separatorIndex);
  const path = withoutScheme.slice(separatorIndex + 1);
  if (!bucket || !path) return null;

  return { bucket, path };
}

export function resolvePublicMediaUrl(value: string | null | undefined) {
  const normalized = clean(value);
  if (!normalized) return null;

  const storage = parseStorageReference(normalized);
  if (!storage) return normalized;

  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(storage.bucket)}/${encodeStoragePath(storage.path)}`;
}

export async function resolvePlaybackOriginUrl(
  admin: SupabaseClient,
  originUrl: string,
  expiresIn = 3600
) {
  const storage = parseStorageReference(originUrl);
  if (!storage) {
    return { ok: true as const, url: originUrl };
  }

  const { data, error } = await admin.storage.from(storage.bucket).createSignedUrl(storage.path, expiresIn);
  if (error || !data?.signedUrl) {
    return {
      ok: false as const,
      error: error?.message ?? "Impossible de signer la source de lecture.",
    };
  }

  return { ok: true as const, url: data.signedUrl };
}

export function isPublicationActive(publication: CatalogPublication, now = new Date()) {
  if (publication.visibility !== "public") return false;
  if (publication.publication_status !== "published") return false;
  if (!WEB_PUBLIC_STOREFRONTS.has((publication.storefront ?? "").trim().toLowerCase())) return false;

  const nowMs = now.getTime();
  const fromMs = publication.available_from ? Date.parse(publication.available_from) : null;
  const toMs = publication.available_to ? Date.parse(publication.available_to) : null;

  if (fromMs !== null && Number.isFinite(fromMs) && nowMs < fromMs) return false;
  if (toMs !== null && Number.isFinite(toMs) && nowMs >= toMs) return false;
  return true;
}

export function pickPreferredAsset(
  assets: CatalogMediaAsset[],
  ownerId: string,
  assetType: CatalogMediaAsset["asset_type"]
) {
  return (
    assets
      .filter((asset) => asset.owner_id === ownerId && asset.asset_type === assetType)
      .sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at))[0] ??
    null
  );
}

function sourceRank(status: CatalogSourceStatus) {
  if (status === "published") return 0;
  if (status === "ready") return 1;
  if (status === "draft") return 2;
  return 3;
}

export function isUsablePlaybackSource(source: CatalogPlaybackSource) {
  return source.source_status === "ready" || source.source_status === "published";
}

export function pickPreferredPlaybackSource(sources: CatalogPlaybackSource[]) {
  return (
    [...sources]
      .filter(isUsablePlaybackSource)
      .sort((left, right) => {
        const statusDiff = sourceRank(left.source_status) - sourceRank(right.source_status);
        if (statusDiff !== 0) return statusDiff;

        const updatedDiff =
          Date.parse(right.updated_at || right.created_at) - Date.parse(left.updated_at || left.created_at);
        if (Number.isFinite(updatedDiff) && updatedDiff !== 0) return updatedDiff;

        return left.created_at.localeCompare(right.created_at);
      })[0] ?? null
  );
}
