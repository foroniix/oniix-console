import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { auditLog } from "../../_utils/audit";
import {
  canTransitionSlotStatus,
  deriveProgramStatusFromSlotStatus,
  windowsOverlap,
} from "../../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

const SlotStatus = z.enum(["scheduled", "published", "cancelled"]);
const SlotVisibility = z.enum(["public", "private"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isNotFound(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

function invalidTransitionResponse() {
  return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
}

function conflictResponse() {
  return NextResponse.json({ error: "Conflit horaire avec un autre slot sur cette chaine." }, { status: 409 });
}

function missingChannelResponse() {
  return NextResponse.json({ error: "La chaine de diffusion est requise." }, { status: 400 });
}

function missingEndResponse() {
  return NextResponse.json({ error: "L'heure de fin est requise pour planifier une diffusion." }, { status: 400 });
}

async function findSlotConflict(params: {
  sb: SupabaseClient;
  tenantId: string;
  channelId: string;
  startsAt: string;
  endsAt: string | null;
  excludeId?: string;
}) {
  const { sb, tenantId, channelId, startsAt, endsAt, excludeId } = params;

  let q = sb
    .from("program_slots")
    .select("id, starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("channel_id", channelId)
    .neq("slot_status", "cancelled");

  if (excludeId) q = q.neq("id", excludeId);
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await params;
  const parsed = await parseJson(
    req,
    z.object({
      programId: z.string().min(1).optional(),
      channelId: z.string().nullable().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().nullable().optional(),
      slotStatus: SlotStatus.optional(),
      visibility: SlotVisibility.optional(),
      notes: z.string().nullable().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const { data: current, error: currentError } = await ctx.sb
    .from("program_slots")
    .select("id, program_id, starts_at, ends_at, slot_status, channel_id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Program slot lookup error", { error: currentError.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  if (
    body.slotStatus !== undefined &&
    !canTransitionSlotStatus(
      current.slot_status as "scheduled" | "published" | "cancelled",
      body.slotStatus
    )
  ) {
    return invalidTransitionResponse();
  }

  if (body.programId !== undefined) {
    const { data: program, error: programError } = await ctx.sb
      .from("programs")
      .select("id")
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", body.programId)
      .maybeSingle();
    if (programError) {
        console.error("Program lookup for slot update error", {
          error: programError.message,
          tenantId: ctx.tenant_id,
          id,
          programId: body.programId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (!program) return notFoundResponse();
  }

  const startsAtIso =
    body.startsAt === undefined ? current.starts_at : toIsoDate(body.startsAt);
  if (body.startsAt !== undefined && !startsAtIso) return invalidResponse();

  const endsAtIso =
    body.endsAt === undefined
      ? current.ends_at
      : body.endsAt === null
        ? null
        : toIsoDate(body.endsAt);
  if (body.endsAt !== undefined && body.endsAt !== null && !endsAtIso) return invalidResponse();

  if (endsAtIso && startsAtIso && endsAtIso <= startsAtIso) return invalidResponse();

  const nextProgramId = body.programId ?? current.program_id;
  const { data: program, error: currentProgramError } = await ctx.sb
    .from("programs")
    .select("id, channel_id, status, published_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", nextProgramId)
    .maybeSingle();

  if (currentProgramError) {
    console.error("Program lookup for slot status sync error", {
      error: currentProgramError.message,
      tenantId: ctx.tenant_id,
      id,
      programId: nextProgramId,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!program) return notFoundResponse();

  const nextChannelId = body.channelId !== undefined ? body.channelId : current.channel_id;
  const nextSlotStatus = body.slotStatus ?? current.slot_status;
  if (nextSlotStatus !== "cancelled" && !nextChannelId) return missingChannelResponse();
  if (nextSlotStatus !== "cancelled" && !endsAtIso) return missingEndResponse();
  if (nextChannelId && nextSlotStatus !== "cancelled") {
    const { error: conflictLookupError, conflictId } = await findSlotConflict({
      sb: ctx.sb,
      tenantId: ctx.tenant_id,
      channelId: nextChannelId,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      excludeId: id,
    });
    if (conflictLookupError) {
        console.error("Program slot conflict lookup on update error", {
          error: conflictLookupError.message,
          tenantId: ctx.tenant_id,
          id,
        });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (conflictId) return conflictResponse();
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: ctx.user_id,
  };

  if (body.programId !== undefined) updateData.program_id = body.programId;
  if (body.channelId !== undefined) updateData.channel_id = body.channelId;
  if (body.startsAt !== undefined) updateData.starts_at = startsAtIso;
  if (body.endsAt !== undefined) updateData.ends_at = endsAtIso;
  if (body.slotStatus !== undefined) updateData.slot_status = body.slotStatus;
  if (body.visibility !== undefined) updateData.visibility = body.visibility;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const { data, error } = await ctx.sb
    .from("program_slots")
    .update(updateData)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("*, program:programs(id,title,poster,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    if (isNotFound(error)) return notFoundResponse();
    console.error("Program slot update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const nextProgramStatus = deriveProgramStatusFromSlotStatus(
    program.status as "draft" | "scheduled" | "published" | "cancelled",
    data.slot_status as "scheduled" | "published" | "cancelled"
  );
  const syncProgramUpdate: Record<string, unknown> = {
    updated_at: updateData.updated_at,
    updated_by: ctx.user_id,
  };

  if (nextProgramStatus !== program.status) {
    syncProgramUpdate.status = nextProgramStatus;
  }
  if (nextProgramStatus === "published") {
    syncProgramUpdate.published_at = program.published_at ?? updateData.updated_at;
  }
  if (!program.channel_id && nextChannelId) {
    syncProgramUpdate.channel_id = nextChannelId;
  }

  if (Object.keys(syncProgramUpdate).length > 2) {
    const { error: syncProgramError } = await ctx.sb
      .from("programs")
      .update(syncProgramUpdate)
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", nextProgramId);

    if (syncProgramError) {
      console.error("Program sync after slot update error", {
        error: syncProgramError.message,
        tenantId: ctx.tenant_id,
        id,
        programId: nextProgramId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action:
      current.slot_status !== "published" && data.slot_status === "published"
        ? "program_slot.publish"
        : "program_slot.update",
    targetType: "program_slot",
    targetId: data.id,
    metadata: {
      previousStatus: current.slot_status,
      nextStatus: data.slot_status,
      changedFields: Object.keys(updateData),
    },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const { id } = await params;
  const { data: current, error: currentError } = await ctx.sb
    .from("program_slots")
    .select("id, slot_status, program_id, channel_id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
      console.error("Program slot lookup before delete error", {
        error: currentError.message,
        tenantId: ctx.tenant_id,
        id,
      });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  const { data, error } = await ctx.sb
    .from("program_slots")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Program slot delete error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!data) return notFoundResponse();

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "program_slot.delete",
    targetType: "program_slot",
    targetId: current.id,
    metadata: {
      slotStatus: current.slot_status,
      programId: current.program_id,
      channelId: current.channel_id,
    },
  });

  return NextResponse.json({ ok: true });
}
