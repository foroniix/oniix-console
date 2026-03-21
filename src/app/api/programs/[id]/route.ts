import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { auditLog } from "../../_utils/audit";
import {
  canTransitionProgramStatus,
  canTransitionSlotStatus,
  isSlotActive,
  windowsOverlap,
} from "../../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

const ProgramStatus = z.enum(["draft", "scheduled", "published", "cancelled"]);
type ProgramStatusValue = z.infer<typeof ProgramStatus>;

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isNotFound(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function invalidTransitionResponse() {
  return NextResponse.json({ error: "Transition de statut invalide." }, { status: 400 });
}

function activeSlotsConflictResponse() {
  return NextResponse.json(
    { error: "Impossible de supprimer un programme publie avec des slots actifs." },
    { status: 409 }
  );
}

function missingPublishedSlotChannelResponse() {
  return NextResponse.json(
    { error: "Tous les slots du programme doivent etre rattaches a une chaine avant publication." },
    { status: 409 }
  );
}

function missingPublishedSlotEndResponse() {
  return NextResponse.json(
    { error: "Tous les slots du programme doivent avoir une heure de fin avant publication." },
    { status: 409 }
  );
}

function slotPublishConflictResponse() {
  return NextResponse.json(
    { error: "Impossible de publier ce programme car un slot entre en conflit sur sa chaine." },
    { status: 409 }
  );
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
      title: z.string().min(1).optional(),
      channelId: z.string().nullable().optional(),
      synopsis: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      poster: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      status: ProgramStatus.optional(),
      publishedAt: z.string().nullable().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const publishedAtIso =
    body.publishedAt === undefined
      ? undefined
      : body.publishedAt === null
        ? null
        : toIsoDate(body.publishedAt);

  if (body.publishedAt !== undefined && body.publishedAt !== null && !publishedAtIso) {
    return invalidResponse();
  }

  const { data: current, error: currentError } = await ctx.sb
    .from("programs")
    .select("id, status, published_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Program lookup error", { error: currentError.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  if (
    body.status !== undefined &&
    !canTransitionProgramStatus(current.status as ProgramStatusValue, body.status)
  ) {
    return invalidTransitionResponse();
  }

  const now = new Date().toISOString();
  const publishingProgram = body.status === "published" && current.status !== "published";

  let slotsToPublish: Array<{
    id: string;
    slot_status: "scheduled" | "published" | "cancelled";
    starts_at: string;
    ends_at: string | null;
    channel_id: string | null;
  }> = [];

  if (publishingProgram) {
    const { data: slotRows, error: slotRowsError } = await ctx.sb
      .from("program_slots")
      .select("id, slot_status, starts_at, ends_at, channel_id")
      .eq("tenant_id", ctx.tenant_id)
      .eq("program_id", id)
      .in("slot_status", ["scheduled", "published"]);

    if (slotRowsError) {
      console.error("Program slots lookup before publish error", {
        error: slotRowsError.message,
        tenantId: ctx.tenant_id,
        id,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    slotsToPublish = ((slotRows ?? []) as typeof slotsToPublish).filter((slot) =>
      canTransitionSlotStatus(slot.slot_status, "published")
    );

    for (const slot of slotsToPublish) {
      if (!slot.channel_id) return missingPublishedSlotChannelResponse();
      if (!slot.ends_at) return missingPublishedSlotEndResponse();

      const { error: conflictLookupError, conflictId } = await findSlotConflict({
        sb: ctx.sb,
        tenantId: ctx.tenant_id,
        channelId: slot.channel_id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        excludeId: slot.id,
      });

      if (conflictLookupError) {
        console.error("Program slot conflict lookup before publish error", {
          error: conflictLookupError.message,
          tenantId: ctx.tenant_id,
          id,
          slotId: slot.id,
        });
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
      }

      if (conflictId) return slotPublishConflictResponse();
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: now,
    updated_by: ctx.user_id,
  };

  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.channelId !== undefined) updateData.channel_id = body.channelId;
  if (body.synopsis !== undefined) updateData.synopsis = body.synopsis;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.poster !== undefined) updateData.poster = body.poster;
  if (body.tags !== undefined) updateData.tags = body.tags;

  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "published") {
      updateData.published_at = publishedAtIso ?? current.published_at ?? now;
    }
  }

  if (body.publishedAt !== undefined) {
    updateData.published_at = publishedAtIso;
  }

  const { data, error } = await ctx.sb
    .from("programs")
    .update(updateData)
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("*, channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    if (isNotFound(error)) return notFoundResponse();
    console.error("Program update error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: body.status === "published" && current.status !== "published" ? "program.publish" : "program.update",
    targetType: "program",
    targetId: data.id,
    metadata: {
      previousStatus: current.status,
      nextStatus: data.status,
      changedFields: Object.keys(updateData),
    },
  });

  if (publishingProgram && slotsToPublish.length > 0) {
    const slotIds = slotsToPublish.map((slot) => slot.id);
    const { data: publishedSlots, error: publishedSlotsError } = await ctx.sb
      .from("program_slots")
      .update({
        slot_status: "published",
        updated_at: now,
        updated_by: ctx.user_id,
      })
      .eq("tenant_id", ctx.tenant_id)
      .eq("program_id", id)
      .in("id", slotIds)
      .select("id");

    if (publishedSlotsError) {
      console.error("Program slot publish sync error", {
        error: publishedSlotsError.message,
        tenantId: ctx.tenant_id,
        id,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    await Promise.all(
      (publishedSlots ?? []).map((slot) =>
        auditLog({
          sb: ctx.sb,
          tenantId: ctx.tenant_id,
          actorUserId: ctx.user_id,
          action: "program_slot.publish",
          targetType: "program_slot",
          targetId: String(slot.id),
          metadata: {
            source: "program_publish",
            programId: id,
          },
        })
      )
    );
  }

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
    .from("programs")
    .select("id, status, title")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
      console.error("Program lookup before delete error", {
        error: currentError.message,
        tenantId: ctx.tenant_id,
        id,
      });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  if (current.status === "published") {
    const nowIso = new Date().toISOString();
    const { data: slots, error: slotsError } = await ctx.sb
      .from("program_slots")
      .select("id, slot_status, ends_at")
      .eq("tenant_id", ctx.tenant_id)
      .eq("program_id", id)
      .in("slot_status", ["scheduled", "published"]);

    if (slotsError) {
        console.error("Program active slots lookup error", {
          error: slotsError.message,
          tenantId: ctx.tenant_id,
          id,
        });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    const hasActiveSlots = (slots ?? []).some((slot) =>
      isSlotActive(slot.slot_status as "scheduled" | "published" | "cancelled", slot.ends_at, nowIso)
    );
    if (hasActiveSlots) return activeSlotsConflictResponse();
  }

  const { data, error } = await ctx.sb
    .from("programs")
    .delete()
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Program delete error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!data) return notFoundResponse();

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: "program.delete",
    targetType: "program",
    targetId: current.id,
    metadata: {
      status: current.status,
      title: current.title,
    },
  });

  return NextResponse.json({ ok: true });
}
