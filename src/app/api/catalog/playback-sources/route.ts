import { NextResponse } from "next/server";
import { z } from "zod";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson, parseQuery } from "../../_utils/validate";
import {
  buildCatalogPlaybackSourceInsert,
  catalogDomainUnavailableResponse,
  catalogPlaybackSourceCreateSchema,
  catalogPolicyUnavailableResponse,
  CATALOG_PLAYBACK_SOURCE_SELECT,
  isCatalogDomainMissing,
  isCatalogPolicyMissing,
  normalizeCatalogPlaybackSourceRow,
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
    .from("catalog_playback_sources")
    .select(CATALOG_PLAYBACK_SOURCE_SELECT)
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
    sources: (data ?? []).map((row) =>
      normalizeCatalogPlaybackSourceRow(row as Record<string, unknown>)
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

  const parsed = await parseJson(req, catalogPlaybackSourceCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogPlaybackSourceInsert(parsed.data, ctx.tenant_id);

  const { data, error } = await ctx.sb
    .from("catalog_playback_sources")
    .insert(payload)
    .select(CATALOG_PLAYBACK_SOURCE_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (isCatalogPolicyMissing(error)) return catalogPolicyUnavailableResponse();
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, source: normalizeCatalogPlaybackSourceRow(data as Record<string, unknown>) },
    { status: 201 }
  );
}
