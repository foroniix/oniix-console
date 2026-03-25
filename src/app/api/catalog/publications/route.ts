import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson, parseQuery } from "../../_utils/validate";
import {
  buildCatalogPublicationInsert,
  catalogDomainUnavailableResponse,
  catalogPolicyUnavailableResponse,
  catalogPublicationCreateSchema,
  CATALOG_PUBLICATION_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogPublicationRow,
} from "../../_utils/catalog";

const querySchema = z.object({
  playable_type: z.string().optional(),
  playable_id: z.string().uuid().optional(),
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
    .from("catalog_publications")
    .select(CATALOG_PUBLICATION_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .order("updated_at", { ascending: false });

  if (parsed.data.playable_type) query = query.eq("playable_type", parsed.data.playable_type);
  if (parsed.data.playable_id) query = query.eq("playable_id", parsed.data.playable_id);

  const { data, error } = await query;

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    publications: (data ?? []).map((row) =>
      normalizeCatalogPublicationRow(row as Record<string, unknown>)
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

  const parsed = await parseJson(req, catalogPublicationCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogPublicationInsert(parsed.data, ctx.tenant_id, ctx.user_id);

  const { data, error } = await ctx.sb
    .from("catalog_publications")
    .insert(payload)
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

  return NextResponse.json(
    { ok: true, publication: normalizeCatalogPublicationRow(data as Record<string, unknown>) },
    { status: 201 }
  );
}
