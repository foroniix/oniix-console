import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

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
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const supa = supabaseUser(ctx.accessToken);

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.logo !== undefined) updateData.logo = body.logo;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from("channels")
      .update(updateData)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Channel update error", { error: error.message, tenantId: ctx.tenantId, id });
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
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const { id } = await params;
    const supa = supabaseUser(ctx.accessToken);

    const { error } = await supa
      .from("channels")
      .delete()
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id);

    if (error) {
      console.error("Channel delete error", { error: error.message, tenantId: ctx.tenantId, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
