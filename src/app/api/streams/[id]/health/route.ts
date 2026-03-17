import { NextResponse, type NextRequest } from "next/server";
import { requireTenantAccess } from "../../../tenant/_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const { id } = await context.params;

  const { data, error } = await ctx.sb
    .from("stream_health")
    .select("*")
    .eq("tenant_id", ctx.tenant_id)
    .eq("stream_id", id)
    .order("ts", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Stream health load error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
