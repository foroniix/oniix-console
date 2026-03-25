import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson, parseQuery } from "../../_utils/validate";
import {
  buildCatalogEpisodeInsert,
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  catalogEpisodeCreateSchema,
  CATALOG_EPISODE_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogEpisodeRow,
} from "../../_utils/catalog";

const querySchema = z.object({
  series_id: z.string().uuid().optional(),
  season_id: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user_id,
    "edit_catalog"
  );
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = parseQuery(req, querySchema);
  if (!parsed.ok) return parsed.res;

  let query = ctx.sb
    .from("catalog_episodes")
    .select(CATALOG_EPISODE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .order("sort_order", { ascending: true })
    .order("episode_number", { ascending: true });

  if (parsed.data.series_id) query = query.eq("series_id", parsed.data.series_id);
  if (parsed.data.season_id) query = query.eq("season_id", parsed.data.season_id);

  const { data, error } = await query;

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    episodes: (data ?? []).map((row) =>
      normalizeCatalogEpisodeRow(row as Record<string, unknown>)
    ),
  });
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user_id,
    "edit_catalog"
  );
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(req, catalogEpisodeCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogEpisodeInsert(parsed.data, ctx.tenant_id, ctx.user_id);

  const { data, error } = await ctx.sb
    .from("catalog_episodes")
    .insert(payload)
    .select(CATALOG_EPISODE_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Cette saison a déjà un épisode avec ce numéro." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, episode: normalizeCatalogEpisodeRow(data as Record<string, unknown>) },
    { status: 201 }
  );
}
