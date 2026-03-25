import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson, parseQuery } from "../../_utils/validate";
import {
  buildCatalogSeasonInsert,
  catalogDomainUnavailableResponse,
  catalogSeasonCreateSchema,
  CATALOG_SEASON_SELECT,
  isCatalogDomainMissing,
  normalizeCatalogSeasonRow,
} from "../../_utils/catalog";

const querySchema = z.object({
  series_id: z.string().uuid().optional(),
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
    .from("catalog_seasons")
    .select(CATALOG_SEASON_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .order("sort_order", { ascending: true })
    .order("season_number", { ascending: true });

  if (parsed.data.series_id) {
    query = query.eq("series_id", parsed.data.series_id);
  }

  const { data, error } = await query;

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    console.error("Catalog seasons load error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    seasons: (data ?? []).map((row) => normalizeCatalogSeasonRow(row as Record<string, unknown>)),
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

  const parsed = await parseJson(req, catalogSeasonCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogSeasonInsert(parsed.data, ctx.tenant_id, ctx.user_id);

  const { data, error } = await ctx.sb
    .from("catalog_seasons")
    .insert(payload)
    .select(CATALOG_SEASON_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Cette série a déjà une saison avec ce numéro." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, season: normalizeCatalogSeasonRow(data as Record<string, unknown>) },
    { status: 201 }
  );
}
