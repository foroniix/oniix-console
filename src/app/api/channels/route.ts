import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext, jsonError, requireTenantCapability } from "../tenant/_utils";
import { parseJson } from "../_utils/validate";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const { data, error } = await ctx.sb
    .from("channels")
    .select("*")
    .eq("tenant_id", ctx.tenant_id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Channels load error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  try {
    const parsed = await parseJson(
      req,
      z.object({
        name: z.string().min(1),
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

    const slug =
      body.slug && body.slug.trim() !== ""
        ? body.slug
        : body.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-");

    const { data, error } = await ctx.sb
      .from("channels")
      .insert({
        tenant_id: ctx.tenant_id,
        name: body.name,
        slug,
        category: body.category ?? "Other",
        active: body.active ?? true,
        is_active: body.active ?? true,
        logo: body.logo ?? null,
        origin_hls_url: originHlsUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Channel create error", { error: error.message, tenantId: ctx.tenant_id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
