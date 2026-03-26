import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogPublicationUpdate,
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  catalogPublicationUpdateSchema,
  CATALOG_PUBLICATION_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogPublicationRow,
} from "../../../_utils/catalog";
import { buildCatalogIndexNowUrls, notifyIndexNow } from "../../../_utils/indexnow";

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

  const parsed = await parseJson(req, catalogPublicationUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_publications")
    .select(CATALOG_PUBLICATION_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(currentRes.error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Publication introuvable." }, { status: 404 });
  }

  const payload = buildCatalogPublicationUpdate(
    parsed.data,
    normalizeCatalogPublicationRow(currentRes.data as Record<string, unknown>),
    ctx.user_id
  );

  const { data, error } = await ctx.sb
    .from("catalog_publications")
    .update(payload)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select(CATALOG_PUBLICATION_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Une publication existe déjà pour ce contenu et cette vitrine." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const publication = normalizeCatalogPublicationRow(data as Record<string, unknown>);
  void notifyIndexNow(buildCatalogIndexNowUrls(publication.playable_id));

  return NextResponse.json({
    ok: true,
    publication,
  });
}
