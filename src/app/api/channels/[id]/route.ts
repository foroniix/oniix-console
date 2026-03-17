import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  try {
    const { id } = await params;
    const parsed = await parseJson(
      req,
      z.object({
        name: z.string().optional(),
        slug: z.string().optional(),
        category: z.string().optional(),
        active: z.boolean().optional(),
        logo: z.string().nullable().optional(),
        originHlsUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const originHlsUrl =
      body.originHlsUrl === undefined || body.originHlsUrl === null || body.originHlsUrl === ""
        ? null
        : body.originHlsUrl;

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.active !== undefined) {
      updateData.active = body.active;
      updateData.is_active = body.active;
    }
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.originHlsUrl !== undefined) updateData.origin_hls_url = originHlsUrl;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await ctx.sb
      .from("channels")
      .update(updateData)
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Channel update error", { error: error.message, tenantId: ctx.tenant_id, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  try {
    const { id } = await params;

    const { error } = await ctx.sb
      .from("channels")
      .delete()
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", id);

    if (error) {
      console.error("Channel delete error", { error: error.message, tenantId: ctx.tenant_id, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
