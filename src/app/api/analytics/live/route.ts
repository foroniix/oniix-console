import { NextResponse } from "next/server";
import { parseQuery } from "../../_utils/validate";
import { requireTenantAccess } from "../../tenant/_utils";
import {
  ANALYTICS_LIVE_QUERY_SCHEMA,
  resolveAnalyticsLiveSnapshot,
} from "../../_utils/analytics-live";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(req, ANALYTICS_LIVE_QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const result = await resolveAnalyticsLiveSnapshot({
    sb: ctx.admin,
    tenantId: ctx.tenant_id,
    channelId: query.data.channelId ?? null,
    streamId: query.data.streamId ?? null,
    windowSec: query.data.windowSec ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
