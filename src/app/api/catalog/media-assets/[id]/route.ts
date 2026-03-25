import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogMediaAssetUpdate,
  catalogDomainUnavailableResponse,
  catalogMediaAssetUpdateSchema,
  catalogPolicyUnavailableResponse,
  CATALOG_MEDIA_ASSET_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogMediaAssetRow,
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

  const parsed = await parseJson(req, catalogMediaAssetUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_media_assets")
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(currentRes.error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Asset introuvable." }, { status: 404 });
  }

  const payload = buildCatalogMediaAssetUpdate(
    parsed.data,
    normalizeCatalogMediaAssetRow(currentRes.data as Record<string, unknown>)
  );

  const { data, error } = await ctx.sb
    .from("catalog_media_assets")
    .update(payload)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select(CATALOG_MEDIA_ASSET_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    asset: normalizeCatalogMediaAssetRow(data as Record<string, unknown>),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
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

  const { error } = await ctx.sb
    .from("catalog_media_assets")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id);

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
