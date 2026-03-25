import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";
import {
  buildCatalogTitleInsert,
  catalogDomainUnavailableResponse,
  catalogTitleCreateSchema,
  CATALOG_TITLE_SELECT,
  isCatalogDomainMissing,
  normalizeCatalogTitleRow,
} from "../../_utils/catalog";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(
    ctx.sb,
    ctx.tenant_id,
    ctx.user_id,
    "edit_catalog"
  );
  if (!permission.ok) return jsonError(permission.error, 403);

  const { data, error } = await ctx.sb
    .from("catalog_titles")
    .select(CATALOG_TITLE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .order("updated_at", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    console.error("Catalog titles load error", {
      error: error.message,
      tenantId: ctx.tenant_id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    titles: (data ?? []).map((row) => normalizeCatalogTitleRow(row as Record<string, unknown>)),
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

  const parsed = await parseJson(req, catalogTitleCreateSchema);
  if (!parsed.ok) return parsed.res;

  const payload = buildCatalogTitleInsert(parsed.data, ctx.tenant_id, ctx.user_id);

  const { data, error } = await ctx.sb
    .from("catalog_titles")
    .insert(payload)
    .select(CATALOG_TITLE_SELECT)
    .single();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Un titre avec ce slug existe déjà dans ce tenant." },
        { status: 409 }
      );
    }

    console.error("Catalog title create error", {
      error: error.message,
      tenantId: ctx.tenant_id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      title: normalizeCatalogTitleRow(data as Record<string, unknown>),
    },
    { status: 201 }
  );
}
