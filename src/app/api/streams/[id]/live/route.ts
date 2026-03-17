import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditLog } from "../../../_utils/audit";
import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";
import { parseJson } from "../../../_utils/validate";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "operate_live");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await context.params;

  const parsed = await parseJson(
    req,
    z.object({
      status: z.string().min(1),
    })
  );
  if (!parsed.ok) return parsed.res;
  const { status } = parsed.data;

  const { data: beforeStream, error: beforeError } = await ctx.sb
    .from("streams")
    .select("id,status")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .single();

  if (beforeError || !beforeStream) {
    if (beforeError) {
      console.error("Stream status lookup error", { error: beforeError.message, tenantId: ctx.tenant_id, id });
    }
    return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const { data, error } = await ctx.sb
    .from("streams")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Stream status update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
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
