import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAccess } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await requireTenantAccess("manage_monetization");
  if (!ctx.ok) return ctx.res;

  const { data, error } = await ctx.sb
    .from("ad_campaigns")
    .select("id, tenant_id, name, type, priority, active, starts_at, ends_at, created_at, updated_at")
    .eq("tenant_id", ctx.tenant_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Campaigns load error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const ctx = await requireTenantAccess("manage_monetization");
  if (!ctx.ok) return ctx.res;

  const parsed = await parseJson(
    req,
    z.object({
      name: z.string().min(1),
      type: z.string().optional(),
      priority: z.number().optional(),
      active: z.boolean().optional(),
      starts_at: z.string().optional(),
      ends_at: z.string().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const name = String(body?.name ?? "").trim();
  const type = String(body?.type ?? "HOUSE").trim();
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 50;
  const active = body?.active === false ? false : true;
  const starts_at = body?.starts_at ? String(body.starts_at) : null;
  const ends_at = body?.ends_at ? String(body.ends_at) : null;

  if (!name) {
    return NextResponse.json({ ok: false, error: "Nom requis." }, { status: 400 });
  }

  const { data, error } = await ctx.sb
    .from("ad_campaigns")
    .insert({
      tenant_id: ctx.tenant_id,
      name,
      type,
      priority,
      active,
      starts_at,
      ends_at,
      created_by: ctx.user_id,
    })
    .select("id, tenant_id, name, type, priority, active, starts_at, ends_at, created_at, updated_at")
    .single();

  if (error) {
    console.error("Campaign create error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, campaign: data }, { status: 201 });
}
