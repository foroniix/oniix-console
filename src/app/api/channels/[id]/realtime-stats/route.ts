import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getChannelOttRealtimeStats } from "../../../_utils/ott-channel-stats";
import { requireTenantAccess } from "../../../tenant/_utils";
import { parseQuery } from "../../../_utils/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const { id } = await params;
  const query = parseQuery(
    req,
    z.object({
      minutes: z.coerce.number().int().min(5).max(60).optional(),
    })
  );
  if (!query.ok) return query.res;

  const result = await getChannelOttRealtimeStats({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    channelId: id,
    rangeMinutes: query.data.minutes ?? 5,
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
    if (result.error === "Migration OTT non appliquee.") {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    console.error("Channel OTT realtime stats error", {
      tenantId: ctx.tenant_id,
      channelId: id,
      error: result.error,
      code: result.code ?? null,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
