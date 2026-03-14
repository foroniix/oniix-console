import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireTenant } from "../../../_utils/auth";
import { getChannelOttRealtimeStats } from "../../../_utils/ott-channel-stats";
import { supabaseUser } from "../../../_utils/supabase";
import { parseQuery } from "../../../_utils/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const query = parseQuery(
    req,
    z.object({
      minutes: z.coerce.number().int().min(5).max(60).optional(),
    })
  );
  if (!query.ok) return query.res;

  const supa = supabaseUser(ctx.accessToken);
  const result = await getChannelOttRealtimeStats({
    sb: supa,
    tenantId: ctx.tenantId!,
    channelId: id,
    rangeMinutes: query.data.minutes ?? 5,
  });

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
    if (result.error === "Migration OTT non appliquée.") {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    console.error("Channel OTT realtime stats error", {
      tenantId: ctx.tenantId,
      channelId: id,
      error: result.error,
      code: result.code ?? null,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
