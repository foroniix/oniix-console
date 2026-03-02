import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, requireTenant } from "../../../_utils/auth";
import { auditLog } from "../../../_utils/audit";
import { canTransitionReplayStatus } from "../../../_utils/programming";
import { supabaseUser } from "../../../_utils/supabase";

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
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const { id } = await params;
  const supa = supabaseUser(ctx.accessToken);

  const { data: current, error: currentError } = await supa
    .from("replays")
    .select("id, hls_url, available_from, available_to, replay_status")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Replay publish lookup error", { error: currentError.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();
  if (!current.hls_url) return invalidResponse();
  if (
    !canTransitionReplayStatus(
      current.replay_status as "draft" | "ready" | "published" | "archived",
      "published"
    )
  ) {
    return invalidTransitionResponse();
  }

  const now = new Date().toISOString();
  const { data, error } = await supa
    .from("replays")
    .update({
      replay_status: "published",
      available_from: current.available_from ?? now,
      updated_at: now,
      updated_by: ctx.userId,
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select("*, stream:streams(id,title,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Replay publish error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
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
