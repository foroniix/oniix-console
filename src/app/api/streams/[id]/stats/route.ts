import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const supa = supabaseUser(ctx.accessToken);

  // Ensure the stream belongs to this tenant
  const { data: stream, error: se } = await supa
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", params.id)
    .single();

  if (se || !stream) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supa
    .from("stream_stats")
    .select("viewers, bitrate_kbps, errors, created_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("stream_id", params.id)
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
