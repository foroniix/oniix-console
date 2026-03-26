import type { MetadataRoute } from "next";

import { supabaseAdmin } from "@/app/api/_utils/supabase";
import { isPublicationActive } from "@/app/api/web/_utils";

const SITE_URL = "https://oniix.space";

function buildUrl(path: string) {
  return `${SITE_URL}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: buildUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildUrl("/we/catalog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: buildUrl("/streaming"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: buildUrl("/tv-live"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildUrl("/films-series"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildUrl("/sport-live"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: buildUrl("/privacy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: buildUrl("/cookies"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  try {
    const admin = supabaseAdmin();

    const [publicationRows, replayRows, streamRows] = await Promise.all([
      admin
        .from("catalog_publications")
        .select("playable_id,playable_type,visibility,publication_status,available_from,available_to,storefront,updated_at")
        .in("playable_type", ["movie", "series"])
        .eq("visibility", "public")
        .eq("publication_status", "published")
        .limit(5000),
      admin
        .from("replays")
        .select("id,available_from,available_to,replay_status,updated_at")
        .eq("replay_status", "published")
        .order("updated_at", { ascending: false })
        .limit(1000),
      admin
        .from("streams")
        .select("id,status,updated_at")
        .eq("status", "LIVE")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);

    if (!publicationRows.error) {
      const publicTitleIds = Array.from(
        new Set(
          (publicationRows.data ?? [])
            .filter((row) =>
              isPublicationActive(
                {
                  id: "",
                  tenant_id: "",
                  playable_type: String(row.playable_type ?? "movie") as "movie" | "series",
                  playable_id: String(row.playable_id ?? ""),
                  visibility: "public",
                  publication_status: "published",
                  available_from: row.available_from ? String(row.available_from) : null,
                  available_to: row.available_to ? String(row.available_to) : null,
                  geo: { allow: [], block: [] },
                  storefront: String(row.storefront ?? "web"),
                  featured_rank: null,
                  published_at: null,
                  created_by: null,
                  updated_by: null,
                  created_at: "",
                  updated_at: row.updated_at ? String(row.updated_at) : "",
                },
                now
              )
            )
            .map((row) => String(row.playable_id ?? "").trim())
            .filter((id) => id.length > 0)
        )
      );

      for (const titleId of publicTitleIds) {
        entries.push({
          url: buildUrl(`/we/catalog/${titleId}`),
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    if (!replayRows.error) {
      const nowMs = Date.now();
      for (const replay of replayRows.data ?? []) {
        const fromMs = replay.available_from ? Date.parse(String(replay.available_from)) : null;
        const toMs = replay.available_to ? Date.parse(String(replay.available_to)) : null;
        if (fromMs !== null && Number.isFinite(fromMs) && fromMs > nowMs) continue;
        if (toMs !== null && Number.isFinite(toMs) && toMs <= nowMs) continue;

        entries.push({
          url: buildUrl(`/we/replays/${String(replay.id)}`),
          lastModified: replay.updated_at ? new Date(String(replay.updated_at)) : now,
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }

    if (!streamRows.error) {
      for (const stream of streamRows.data ?? []) {
        entries.push({
          url: buildUrl(`/we/${String(stream.id)}`),
          lastModified: stream.updated_at ? new Date(String(stream.updated_at)) : now,
          changeFrequency: "hourly",
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error("sitemap_generation_failed", error);
  }

  return entries;
}
