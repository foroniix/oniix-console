import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogSeasonUpdate,
  catalogDomainUnavailableResponse,
  catalogSeasonUpdateSchema,
  CATALOG_SEASON_SELECT,
  isCatalogDomainMissing,
  normalizeCatalogSeasonRow,
} from "../../../_utils/catalog";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user_id,
    "edit_catalog"
  );
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(req, catalogSeasonUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_seasons")
    .select(CATALOG_SEASON_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Saison introuvable." }, { status: 404 });
  }

  const payload = buildCatalogSeasonUpdate(
    parsed.data,
    normalizeCatalogSeasonRow(currentRes.data as Record<string, unknown>),
    ctx.user_id
  );

  const { data, error } = await ctx.sb
    .from("catalog_seasons")
    .update(payload)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
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

  return NextResponse.json({
    ok: true,
    season: normalizeCatalogSeasonRow(data as Record<string, unknown>),
  });
}
