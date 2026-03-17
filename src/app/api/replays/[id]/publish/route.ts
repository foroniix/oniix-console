import { NextResponse, type NextRequest } from "next/server";
import { auditLog } from "../../../_utils/audit";
import { canTransitionReplayStatus } from "../../../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function invalidTransitionResponse() {
  return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await params;

  const { data: current, error: currentError } = await ctx.sb
    .from("replays")
    .select("id, hls_url, available_from, available_to, replay_status")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Replay publish lookup error", { error: currentError.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();
  if (!current.hls_url) return invalidResponse();
  if (
    !canTransitionReplayStatus(
      current.replay_status as "draft" | "processing" | "ready" | "published" | "archived",
      "published"
    )
  ) {
    return invalidTransitionResponse();
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.sb
    .from("replays")
    .update({
      replay_status: "published",
      available_from: current.available_from ?? now,
      updated_at: now,
      updated_by: ctx.user_id,
    })
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Replay publish error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "replay.publish",
    targetType: "replay",
    targetId: data.id,
    metadata: {
      previousStatus: current.replay_status,
      nextStatus: data.replay_status,
      availableFrom: data.available_from ?? null,
    },
  });

  return NextResponse.json(data);
}
