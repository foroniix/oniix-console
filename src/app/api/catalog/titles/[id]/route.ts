import { NextResponse } from "next/server";

import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";
import {
  buildCatalogTitleUpdate,
  catalogDomainUnavailableResponse,
  catalogTitleUpdateSchema,
  CATALOG_TITLE_SELECT,
  isCatalogDomainMissing,
  normalizeCatalogTitleRow,
} from "../../../_utils/catalog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
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

  const { data, error } = await ctx.sb
    .from("catalog_titles")
    .select(CATALOG_TITLE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isCatalogDomainMissing(error)) return catalogDomainUnavailableResponse();
    console.error("Catalog title load error", {
      error: error.message,
      tenantId: ctx.tenant_id,
      titleId: id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Titre introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    title: normalizeCatalogTitleRow(data as Record<string, unknown>),
  });
}

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

  const parsed = await parseJson(req, catalogTitleUpdateSchema);
  if (!parsed.ok) return parsed.res;

  const currentRes = await ctx.sb
    .from("catalog_titles")
    .select(CATALOG_TITLE_SELECT)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentRes.error) {
    if (isCatalogDomainMissing(currentRes.error)) return catalogDomainUnavailableResponse();
    console.error("Catalog title preload error", {
      error: currentRes.error.message,
      tenantId: ctx.tenant_id,
      titleId: id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!currentRes.data) {
    return NextResponse.json({ ok: false, error: "Titre introuvable." }, { status: 404 });
  }

  const updateData = buildCatalogTitleUpdate(
    parsed.data,
    normalizeCatalogTitleRow(currentRes.data as Record<string, unknown>),
    ctx.user_id
  );

  const { data, error } = await ctx.sb
    .from("catalog_titles")
    .update(updateData)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
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

    console.error("Catalog title update error", {
      error: error.message,
      tenantId: ctx.tenant_id,
      titleId: id,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    title: normalizeCatalogTitleRow(data as Record<string, unknown>),
  });
}
