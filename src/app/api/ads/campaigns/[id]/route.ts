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
      priority: z.number().optional(),
      active: z.boolean().optional(),
      starts_at: z.string().optional(),
      ends_at: z.string().optional(),
      targeting: z.record(z.string(), z.any()).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const patch: Record<string, unknown> = {
    name: body.name,
    type: body.type,
    priority: typeof body.priority === "number" ? body.priority : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    starts_at: body.starts_at ?? undefined,
    ends_at: body.ends_at ?? undefined,
    targeting: body.targeting ?? undefined,
  };

  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await ctx.sb
    .from("ad_campaigns")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", ctx.tenant_id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Campaign update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, campaign: data }, { status: 200 });
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
    .from("ad_campaigns")
    .update({ status: "ARCHIVED", active: false })
    .eq("id", id)
    .eq("tenant_id", ctx.tenant_id);

  if (error) {
    console.error("Campaign archive error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
