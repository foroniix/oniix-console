import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson, parseQuery } from "../../_utils/validate";
import {
  buildCatalogMediaAssetInsert,
  catalogDomainUnavailableResponse,
  catalogMediaAssetCreateSchema,
  catalogPolicyUnavailableResponse,
  CATALOG_MEDIA_ASSET_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogMediaAssetRow,
} from "../../_utils/catalog";

const querySchema = z.object({
  owner_type: z.enum(["title", "season", "episode"]).optional(),
  owner_id: z.string().uuid().optional(),
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
    .from("catalog_media_assets")
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .order("asset_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (parsed.data.owner_type) query = query.eq("owner_type", parsed.data.owner_type);
  if (parsed.data.owner_id) query = query.eq("owner_id", parsed.data.owner_id);

  const { data, error } = await query;

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    assets: (data ?? []).map((row) => normalizeCatalogMediaAssetRow(row as Record<string, unknown>)),
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

  const parsed = await parseJson(req, catalogMediaAssetCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogMediaAssetInsert(parsed.data, ctx.tenant_id);

  const { data, error } = await ctx.sb
    .from("catalog_media_assets")
    .insert(payload)
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, asset: normalizeCatalogMediaAssetRow(data as Record<string, unknown>) },
    { status: 201 }
  );
}
