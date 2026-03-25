import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogEpisodeUpdate,
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  catalogEpisodeUpdateSchema,
  CATALOG_EPISODE_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogEpisodeRow,
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

  const parsed = await parseJson(req, catalogEpisodeUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_episodes")
    .select(CATALOG_EPISODE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(currentRes.error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Épisode introuvable." }, { status: 404 });
  }

  const payload = buildCatalogEpisodeUpdate(
    parsed.data,
    normalizeCatalogEpisodeRow(currentRes.data as Record<string, unknown>),
    ctx.user_id
  );

  const { data, error } = await ctx.sb
    .from("catalog_episodes")
    .update(payload)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
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

  return NextResponse.json({
    ok: true,
    episode: normalizeCatalogEpisodeRow(data as Record<string, unknown>),
  });
}
