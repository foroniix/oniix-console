// src/app/api/analytics/collect/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

interface AnalyticsPayload {
  sessionId: string;
  eventType: string;
  userId?: string;
  streamId?: string;
  deviceType?: string;
  os?: string;
  country?: string;
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const body: AnalyticsPayload = await req.json();

    if (!body.sessionId || !body.eventType) {
      return NextResponse.json({ error: "Les champs 'sessionId' et 'eventType' sont requis." }, { status: 400 });
    }

    const supa = supabaseUser(ctx.accessToken);

    const { error } = await supa.from("analytics_events").insert({
      tenant_id: ctx.tenantId,
      session_id: body.sessionId,
      user_id: body.userId || ctx.userId || null,
      event_type: body.eventType,
      stream_id: body.streamId || null,
      device_type: body.deviceType || "desktop",
      os: body.os || "Unknown",
      country: body.country || "Unknown",
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, message: "Événement enregistré avec succès" });
  } catch (err: any) {
    console.error("Analytics Route Error:", err.message);
    return NextResponse.json({ error: err.message || "Erreur interne du serveur" }, { status: 500 });
  }
}
