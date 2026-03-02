import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { auditLog } from "../../../_utils/audit";
import { supabaseUser } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await context.params;

  const parsed = await parseJson(
    req,
    z.object({
      status: z.string().min(1),
    })
  );
  if (!parsed.ok) return parsed.res;
  const { status } = parsed.data;
  const supa = supabaseUser(ctx.accessToken);

  const { data: beforeStream, error: beforeError } = await supa
    .from("streams")
    .select("id,status")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .single();

  if (beforeError || !beforeStream) {
    if (beforeError) {
      console.error("Stream status lookup error", { error: beforeError.message, tenantId: ctx.tenantId, id });
    }
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const { data, error } = await supa
    .from("streams")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Stream status update error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: "STREAM_STATUS_UPDATED",
    targetType: "stream",
    targetId: id,
    metadata: {
      before: { status: beforeStream.status },
      after: { status },
    },
  });
  return NextResponse.json(data);
}
