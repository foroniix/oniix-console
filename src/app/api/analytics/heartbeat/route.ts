import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext, jsonError } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const parsed = await parseJson(
    req,
    z.object({
      session_id: z.string().min(1),
      stream_id: z.string().optional(),
      device: z.string().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const session_id = parsed.data.session_id.trim();
  const stream_id = parsed.data.stream_id?.trim() ?? null;
  const device = parsed.data.device?.trim() ?? null;

  if (!session_id) return jsonError("Donnee requise manquante.", 400);

  const { error } = await ctx.sb.from("analytics_events").insert({
    tenant_id: ctx.tenant_id,
    stream_id,
    session_id,
    user_id: ctx.user.id,
    event_type: "heartbeat",
    device,
  });

  if (error) {
    console.error("Analytics heartbeat error", { error: error.message, tenantId: ctx.tenant_id });
    return jsonError("Une erreur est survenue.", 400);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
