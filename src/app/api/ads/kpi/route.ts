import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAccess } from "../../tenant/_utils";
import { parseQuery } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(
    req,
    z.object({
      hours: z.coerce.number().optional(),
    })
  );
  if (!query.ok) return query.res;
  const hours = Math.min(Math.max(Number(query.data.hours ?? 24), 1), 168);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const sb = ctx.sb;
  const tenant_id = ctx.tenant_id;

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
