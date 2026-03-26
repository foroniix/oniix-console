import type { Metadata } from "next";

import { supabaseAdmin } from "@/app/api/_utils/supabase";
import { isPublicationActive, resolvePublicMediaUrl } from "@/app/api/web/_utils";

const SITE_URL = "https://oniix.space";

function clean(value?: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function buildWebMetadata(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const imageUrl = clean(input.image);
  const canonicalUrl = absoluteUrl(input.path);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "Oniix",
      title: input.title,
      description: input.description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export async function getWebCatalogTitleMetadata(titleId: string): Promise<Metadata> {
  const admin = supabaseAdmin();
  const now = new Date();

  const { data: titleRow } = await admin
    .from("catalog_titles")
    .select("id,title,title_type,short_synopsis,long_synopsis,editorial_status")
    .eq("id", titleId)
    .in("editorial_status", ["ready", "published"])
    .maybeSingle();

  if (!titleRow) {
    return buildWebMetadata({
      title: "Catalogue web | Oniix",
      description: "Films et series disponibles en lecture web sur Oniix.",
      path: `/we/catalog/${titleId}`,
    });
  }

  const { data: publicationRows } = await admin
    .from("catalog_publications")
    .select("visibility,publication_status,available_from,available_to,storefront")
    .eq("playable_type", String(titleRow.title_type))
    .eq("playable_id", String(titleRow.id))
    .eq("visibility", "public")
    .eq("publication_status", "published")
    .limit(10);

  const hasActivePublication = (publicationRows ?? []).some((row) =>
    isPublicationActive(
      {
        id: "",
        tenant_id: "",
        playable_type: String(titleRow.title_type) as "movie" | "series",
        playable_id: String(titleRow.id),
        visibility: String(row.visibility ?? "private") as "private" | "public" | "unlisted",
        publication_status: String(row.publication_status ?? "draft") as
          | "draft"
          | "scheduled"
          | "published"
          | "archived",
        available_from: clean(String(row.available_from ?? "")),
        available_to: clean(String(row.available_to ?? "")),
        geo: { allow: [], block: [] },
        storefront: String(row.storefront ?? "web"),
        featured_rank: null,
        published_at: null,
        created_by: null,
        updated_by: null,
        created_at: "",
        updated_at: "",
      },
      now
    )
  );

  if (!hasActivePublication) {
    return buildWebMetadata({
      title: "Catalogue web | Oniix",
      description: "Films et series disponibles en lecture web sur Oniix.",
      path: `/we/catalog/${titleId}`,
    });
  }

  const { data: assetRows } = await admin
    .from("catalog_media_assets")
    .select("asset_type,source_url,sort_order")
    .eq("owner_type", "title")
    .eq("owner_id", titleId)
    .order("sort_order", { ascending: true })
    .limit(20);

  const posterUrl = resolvePublicMediaUrl(
    (assetRows ?? []).find((asset) => asset.asset_type === "poster")?.source_url ?? null
  );
  const backdropUrl = resolvePublicMediaUrl(
    (assetRows ?? []).find((asset) => asset.asset_type === "backdrop")?.source_url ?? null
  );
  const image = backdropUrl || posterUrl;
  const description =
    clean(String(titleRow.long_synopsis ?? "")) ||
    clean(String(titleRow.short_synopsis ?? "")) ||
    "Contenu disponible en lecture web sur Oniix.";

  return buildWebMetadata({
    title: `${String(titleRow.title)} | Oniix`,
    description,
    path: `/we/catalog/${titleId}`,
    image,
  });
}

export async function getWebReplayMetadata(replayId: string): Promise<Metadata> {
  const admin = supabaseAdmin();
  const nowMs = Date.now();

  const { data } = await admin
    .from("replays")
    .select("id,title,synopsis,poster,available_from,available_to,replay_status,channel:channels(name)")
    .eq("id", replayId)
    .maybeSingle();

  const replay = data as
    | {
        id: string;
        title: string | null;
        synopsis: string | null;
        poster: string | null;
        available_from: string | null;
        available_to: string | null;
        replay_status: string | null;
        channel?: { name?: string | null } | Array<{ name?: string | null }> | null;
      }
    | null;

  if (!replay) {
    return buildWebMetadata({
      title: "Replay web | Oniix",
      description: "Replays disponibles en lecture web sur Oniix.",
      path: `/we/replays/${replayId}`,
    });
  }

  const fromMs = replay.available_from ? Date.parse(replay.available_from) : null;
  const toMs = replay.available_to ? Date.parse(replay.available_to) : null;
  const isAvailable =
    String(replay.replay_status ?? "").toLowerCase() === "published" &&
    !(fromMs !== null && Number.isFinite(fromMs) && fromMs > nowMs) &&
    !(toMs !== null && Number.isFinite(toMs) && toMs <= nowMs);

  if (!isAvailable) {
    return buildWebMetadata({
      title: "Replay web | Oniix",
      description: "Replays disponibles en lecture web sur Oniix.",
      path: `/we/replays/${replayId}`,
    });
  }

  const channel = Array.isArray(replay.channel) ? replay.channel[0] : replay.channel;
  const title = clean(replay.title) || "Replay";
  const description = clean(replay.synopsis) || "Replay disponible en lecture web sur Oniix.";

  return buildWebMetadata({
    title: `${title}${channel?.name ? ` | ${channel.name}` : ""} | Oniix`,
    description,
    path: `/we/replays/${replayId}`,
    image: replay.poster ?? null,
  });
}

export async function getWebLiveMetadata(streamId: string): Promise<Metadata> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("streams")
    .select("id,title,description,poster,status,channel:channels(name)")
    .eq("id", streamId)
    .maybeSingle();

  const stream = data as
    | {
        id: string;
        title: string | null;
        description: string | null;
        poster: string | null;
        status: string | null;
        channel?: { name?: string | null } | Array<{ name?: string | null }> | null;
      }
    | null;

  if (!stream) {
    return buildWebMetadata({
      title: "TV web | Oniix",
      description: "Regardez les chaines TV et les directs Oniix depuis votre navigateur.",
      path: `/we/${streamId}`,
    });
  }

  const channel = Array.isArray(stream.channel) ? stream.channel[0] : stream.channel;
  const streamTitle = clean(stream.title) || clean(channel?.name) || "Direct Oniix";
  const description =
    clean(stream.description) ||
    (channel?.name
      ? `Regardez ${channel.name} en direct depuis votre navigateur sur Oniix.`
      : "Regardez les directs Oniix depuis votre navigateur.");

  return buildWebMetadata({
    title: `${streamTitle} | Oniix`,
    description,
    path: `/we/${streamId}`,
    image: stream.poster ?? null,
  });
}
