import { NextResponse } from "next/server";
import { getTenantContext, jsonError } from "../../tenant/_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("No tenant_id on user", 400);

  const body = await req.json().catch(() => ({}));
  const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
  const stream_id = typeof body.stream_id === "string" ? body.stream_id.trim() : null;
  const device = typeof body.device === "string" ? body.device.trim() : null;

  if (!session_id) return jsonError("session_id manquant", 400);

  // Insert via service role => fiable et évite spam direct côté client
  const { error } = await ctx.admin.from("analytics_events").insert({
    tenant_id: ctx.tenant_id,
    stream_id,
    session_id,
    user_id: ctx.user.id,
    event_type: "heartbeat",
    device,
  });

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true }, { status: 200 });
}
