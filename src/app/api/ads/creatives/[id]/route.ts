import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAccess } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantAccess("manage_monetization");
  if (!ctx.ok) return ctx.res;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Identifiant manquant." }, { status: 400 });

  const parsed = await parseJson(
    request,
    z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      active: z.boolean().optional(),
      url: z.string().optional(),
      mime: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      duration_ms: z.number().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const patch: Record<string, unknown> = {
    name: body.name,
    type: body.type,
    active: typeof body.active === "boolean" ? body.active : undefined,
    url: body.url ?? undefined,
    mime: body.mime ?? undefined,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
    duration_ms: typeof body.duration_ms === "number" ? body.duration_ms : undefined,
    metadata: body.metadata ?? undefined,
  };

  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await ctx.sb
    .from("ad_creatives")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", ctx.tenant_id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Ad creative update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, creative: data }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantAccess("manage_monetization");
  if (!ctx.ok) return ctx.res;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Identifiant manquant." }, { status: 400 });

  const { error } = await ctx.sb
    .from("ad_creatives")
    .update({ status: "ARCHIVED", active: false })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant_id);

  if (error) {
    console.error("Ad creative archive error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
