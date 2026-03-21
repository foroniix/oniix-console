import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { auditLog } from "../../../_utils/audit";
import {
  canTransitionProgramStatus,
  canTransitionSlotStatus,
  windowsOverlap,
} from "../../../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../../../tenant/_utils";

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

function invalidTransitionResponse() {
  return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
}

function conflictResponse() {
  return NextResponse.json({ error: "Conflit horaire avec un autre slot sur cette chaine." }, { status: 409 });
}

async function findSlotConflict(params: {
  sb: SupabaseClient;
  tenantId: string;
  channelId: string;
  startsAt: string;
  endsAt: string | null;
  excludeId: string;
}) {
  const { sb, tenantId, channelId, startsAt, endsAt, excludeId } = params;

  let q = sb
    .from("program_slots")
    .select("id, starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("channel_id", channelId)
    .neq("slot_status", "cancelled")
    .neq("id", excludeId);

  if (endsAt) q = q.lt("starts_at", endsAt);
  q = q.or(`ends_at.is.null,ends_at.gt.${startsAt}`);

  const { data, error } = await q;
  if (error) return { error, conflictId: null as string | null };

  const conflict = (data ?? []).find((slot) =>
    windowsOverlap(
      { startsAt, endsAt },
      { startsAt: slot.starts_at as string, endsAt: (slot.ends_at as string | null) ?? null }
    )
  );

  return { error: null, conflictId: conflict?.id ?? null };
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
  const now = new Date().toISOString();
  const { data: current, error: currentError } = await ctx.sb
    .from("program_slots")
    .select("id, program_id, slot_status, starts_at, ends_at, channel_id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
      console.error("Program slot publish lookup error", {
        error: currentError.message,
        tenantId: ctx.tenant_id,
        id,
      });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();
  if (!canTransitionSlotStatus(current.slot_status as "scheduled" | "published" | "cancelled", "published")) {
    return invalidTransitionResponse();
  }

  const { data: currentProgram, error: programLookupError } = await ctx.sb
    .from("programs")
    .select("id, status, channel_id, published_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", current.program_id)
    .maybeSingle();

  if (programLookupError) {
      console.error("Program lookup before slot publish error", {
        error: programLookupError.message,
        tenantId: ctx.tenant_id,
        id,
        programId: current.program_id,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!currentProgram) return notFoundResponse();
  if (
    !canTransitionProgramStatus(
      currentProgram.status as "draft" | "scheduled" | "published" | "cancelled",
      "published"
    )
  ) {
    return invalidTransitionResponse();
  }

  if (current.channel_id) {
    const { error: conflictLookupError, conflictId } = await findSlotConflict({
      sb: ctx.sb,
      tenantId: ctx.tenant_id,
      channelId: current.channel_id,
      startsAt: current.starts_at as string,
      endsAt: (current.ends_at as string | null) ?? null,
      excludeId: id,
    });

    if (conflictLookupError) {
        console.error("Program slot publish conflict lookup error", {
          error: conflictLookupError.message,
          tenantId: ctx.tenant_id,
          id,
        });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (conflictId) return conflictResponse();
  }

  const { data: slot, error: slotError } = await ctx.sb
    .from("program_slots")
    .update({
      slot_status: "published",
      updated_at: now,
      updated_by: ctx.user_id,
    })
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("id, program_id")
    .maybeSingle();

  if (slotError) {
    console.error("Program slot publish error", { error: slotError.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!slot) return notFoundResponse();

  const { error: programError } = await ctx.sb
    .from("programs")
    .update({
      status: "published",
      published_at: currentProgram.published_at ?? now,
      channel_id: currentProgram.channel_id ?? current.channel_id,
      updated_at: now,
      updated_by: ctx.user_id,
    })
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", slot.program_id);

  if (programError) {
      console.error("Program status sync on slot publish error", {
        error: programError.message,
        tenantId: ctx.tenant_id,
        id,
        programId: slot.program_id,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const { data, error } = await ctx.sb
    .from("program_slots")
    .select("*, program:programs(id,title,poster,status), channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Program slot reload after publish error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "program_slot.publish",
    targetType: "program_slot",
    targetId: data.id,
    metadata: {
      previousStatus: current.slot_status,
      nextStatus: data.slot_status,
      programId: data.program_id,
    },
  });

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "program.publish",
    targetType: "program",
    targetId: slot.program_id,
    metadata: {
      previousStatus: currentProgram.status,
      nextStatus: "published",
      source: "program_slot_publish",
      slotId: data.id,
    },
  });

  return NextResponse.json(data);
}
