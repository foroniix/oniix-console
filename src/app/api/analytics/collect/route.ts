// src/app/api/analytics/collect/route.ts (multi-tenant)
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

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
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  try {
    const parsed = await parseJson(
      req,
      z.object({
        sessionId: z.string().min(1),
        eventType: z.string().min(1),
        userId: z.string().optional(),
        streamId: z.string().optional(),
        deviceType: z.string().optional(),
        os: z.string().optional(),
        country: z.string().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body: AnalyticsPayload = parsed.data;

    if (!body.sessionId || !body.eventType) {
      return NextResponse.json({ error: "Donnees requises manquantes." }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Analytics Route Error:", err?.message || err);
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
