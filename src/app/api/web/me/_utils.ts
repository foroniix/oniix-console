import type { SupabaseClient } from "@supabase/supabase-js";

export const WEB_PROGRESS_PLAYABLE_TYPES = ["movie", "episode"] as const;
export const WEB_WATCHLIST_PLAYABLE_TYPES = ["movie", "series", "episode"] as const;

export type WebProgressPlayableType = (typeof WEB_PROGRESS_PLAYABLE_TYPES)[number];
export type WebWatchlistPlayableType = (typeof WEB_WATCHLIST_PLAYABLE_TYPES)[number];

export async function resolveTenantForPlayable(
  admin: SupabaseClient,
  playableType: WebProgressPlayableType | WebWatchlistPlayableType,
  playableId: string
) {
  if (playableType === "movie" || playableType === "series") {
    const { data, error } = await admin
      .from("catalog_titles")
      .select("id,tenant_id")
      .eq("id", playableId)
      .maybeSingle();

    if (error) {
      return { ok: false as const, error: error.message };
    }

    return {
      ok: Boolean(data?.tenant_id) as boolean,
      tenantId: data?.tenant_id ? String(data.tenant_id) : null,
      error: data ? null : "Contenu introuvable.",
    };
  }

  const { data, error } = await admin
    .from("catalog_episodes")
    .select("id,tenant_id")
    .eq("id", playableId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: Boolean(data?.tenant_id) as boolean,
    tenantId: data?.tenant_id ? String(data.tenant_id) : null,
    error: data ? null : "Contenu introuvable.",
  };
}
