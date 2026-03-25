import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogPlaybackSourceUpdate,
  catalogDomainUnavailableResponse,
  catalogPlaybackSourceUpdateSchema,
  catalogPolicyUnavailableResponse,
  CATALOG_PLAYBACK_SOURCE_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogPlaybackSourceRow,
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

  const parsed = await parseJson(req, catalogPlaybackSourceUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_playback_sources")
    .select(CATALOG_PLAYBACK_SOURCE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(currentRes.error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Source introuvable." }, { status: 404 });
  }

  const payload = buildCatalogPlaybackSourceUpdate(
    parsed.data,
    normalizeCatalogPlaybackSourceRow(currentRes.data as Record<string, unknown>)
  );

  const { data, error } = await ctx.sb
    .from("catalog_playback_sources")
    .update(payload)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select(CATALOG_PLAYBACK_SOURCE_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    source: normalizeCatalogPlaybackSourceRow(data as Record<string, unknown>),
  });
}
