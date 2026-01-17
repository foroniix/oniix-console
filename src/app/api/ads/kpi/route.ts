import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;

  const ctx = auth.ctx;
  const tenantRes = requireTenant(ctx);
  if (tenantRes) return tenantRes;

  const url = new URL(req.url);
  const hours = Math.min(Math.max(Number(url.searchParams.get("hours") ?? "24"), 1), 168);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const sb = supabaseUser(ctx.accessToken);

  const tenant_id = ctx.tenantId as string;

  // Counts
  const { count: impressions } = await sb
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant_id)
    .eq("event", "IMPRESSION")
    .gte("created_at", since);

  const { count: clicks } = await sb
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant_id)
    .eq("event", "CLICK")
    .gte("created_at", since);

  const imp = Number(impressions ?? 0);
  const clk = Number(clicks ?? 0);
  const ctr = imp > 0 ? (clk / imp) * 100 : 0;

  return NextResponse.json({
    window_hours: hours,
    impressions: imp,
    clicks: clk,
    ctr,
    since,
  });
}
