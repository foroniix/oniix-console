import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireTenantAccess } from "../../../../tenant/_utils";
import { parseJson } from "../../../../_utils/validate";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireTenantAccess("operate_live");
  if (!ctx.ok) return ctx.res;

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
  // Ensure stream belongs to tenant
  const { data: stream, error: se } = await ctx.sb
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .single();

  if (se || !stream) {
    if (se) {
      console.error("Stream stats lookup error", { error: se.message, tenantId: ctx.tenant_id, id });
    }
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const { error } = await ctx.sb.from("stream_stats").insert({
    tenant_id: ctx.tenant_id,
    stream_id: id,
    viewers: body.viewers,
    bitrate_kbps: body.bitrate,
    errors: body.errors ?? 0,
  });

  if (error) {
    console.error("Stream stats ingest error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
