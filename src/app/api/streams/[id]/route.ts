import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

// MODIFICATION (PATCH)
export async function PATCH(
  req: NextRequest,
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
        title: z.string().optional(),
        hlsUrl: z.string().optional(),
        status: z.string().optional(),
        channelId: z.string().optional(),
        description: z.string().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const supa = supabaseUser(ctx.accessToken);

    const payload: any = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.hlsUrl !== undefined) payload.hls_url = body.hlsUrl;
    if (body.status !== undefined) payload.status = body.status;
    if (body.channelId !== undefined) payload.channel_id = body.channelId;
    if (body.description !== undefined) payload.description = body.description;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from("streams")
      .update(payload)
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Stream update error", { error: error.message, tenantId: ctx.tenantId, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}

// SUPPRESSION (DELETE)
export async function DELETE(
  req: NextRequest,
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
      .from("streams")
      .delete()
      .eq("tenant_id", ctx.tenantId)
      .eq("id", id);

    if (error) {
      console.error("Stream delete error", { error: error.message, tenantId: ctx.tenantId, id });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
