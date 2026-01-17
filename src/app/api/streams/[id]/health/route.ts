import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { supabaseUser } from "../../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const supa = supabaseUser(ctx.accessToken);

  const { data, error } = await supa
    .from("stream_health")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("stream_id", id)
    .order("ts", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Stream health load error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
