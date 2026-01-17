import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../../../_utils/auth";
import { supabaseUser } from "../../../../_utils/supabase";
import { parseJson } from "../../../../_utils/validate";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;

  const parsed = await parseJson(
    req,
    z.object({
      viewers: z.number(),
      bitrate: z.number(),
      errors: z.number().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;
  const supa = supabaseUser(ctx.accessToken);

  // Ensure stream belongs to tenant
  const { data: stream, error: se } = await supa
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .single();

  if (se || !stream) {
    if (se) {
      console.error("Stream stats lookup error", { error: se.message, tenantId: ctx.tenantId, id });
    }
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const { error } = await supa.from("stream_stats").insert({
    tenant_id: ctx.tenantId,
    stream_id: id,
    viewers: body.viewers,
    bitrate_kbps: body.bitrate,
    errors: body.errors ?? 0,
  });

  if (error) {
    console.error("Stream stats ingest error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
