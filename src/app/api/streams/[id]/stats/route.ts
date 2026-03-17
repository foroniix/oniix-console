import { NextResponse, type NextRequest } from "next/server";
import { requireTenantAccess } from "../../../tenant/_utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const { id } = await params;

  // Ensure the stream belongs to this tenant
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

  const { data, error } = await ctx.sb
    .from("stream_stats")
    .select("viewers, bitrate_kbps, errors, created_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("stream_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ viewers: 0, bitrate: 0, errors: 0, updatedAt: null });
  }

  return NextResponse.json({
    viewers: data.viewers,
    bitrate: data.bitrate_kbps,
    errors: data.errors,
    updatedAt: data.created_at,
  });
}
