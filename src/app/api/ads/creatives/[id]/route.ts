import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant, requireRole } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CREATIVES_RW_ROLES = ["owner", "admin", "tenant_admin", "superadmin"] as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = await requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CREATIVES_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

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
      metadata: z.record(z.any()).optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const sb = supabaseUser(auth.ctx.accessToken);

  const patch: any = {
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

  const { data, error } = await sb
    .from("ad_creatives")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Ad creative update error", { error: error.message, tenantId: auth.ctx.tenantId, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, creative: data }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const tRes = await requireTenant(auth.ctx);
  if (tRes) return tRes;

  const rRes = requireRole(auth.ctx, CREATIVES_RW_ROLES as unknown as string[]);
  if (rRes) return rRes;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "Identifiant manquant." }, { status: 400 });

  const sb = supabaseUser(auth.ctx.accessToken);

  const { error } = await sb
    .from("ad_creatives")
    .update({ status: "ARCHIVED", active: false })
    .eq("id", id)
    .eq("tenant_id", auth.ctx.tenantId);

  if (error) {
    console.error("Ad creative archive error", { error: error.message, tenantId: auth.ctx.tenantId, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
