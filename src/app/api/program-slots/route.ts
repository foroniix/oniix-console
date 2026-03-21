import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { auditLog } from "../_utils/audit";
import { deriveProgramStatusFromSlotStatus, windowsOverlap } from "../_utils/programming";
import { getTenantContext, jsonError, requireTenantCapability } from "../tenant/_utils";
import { parseJson, parseQuery } from "../_utils/validate";

const SlotStatus = z.enum(["scheduled", "published", "cancelled"]);
const SlotVisibility = z.enum(["public", "private"]);

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function invalidResponse() {
  return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
}

function notFoundResponse() {
  return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
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

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const query = parseQuery(
    req,
    z.object({
      programId: z.string().optional(),
      channelId: z.string().optional(),
      status: SlotStatus.optional(),
      visibility: SlotVisibility.optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(300).optional(),
    })
  );
  if (!query.ok) return query.res;

  const fromIso = toIsoDate(query.data.from);
  const toIso = toIsoDate(query.data.to);
  if (query.data.from && !fromIso) return invalidResponse();
  if (query.data.to && !toIso) return invalidResponse();

  let q = ctx.sb
    .from("program_slots")
    .select("*, program:programs(id,title,poster,status), channel:channels(id,name,logo,category)")
    .eq("tenant_id", ctx.tenant_id)
    .order("starts_at", { ascending: true });

  if (query.data.programId) q = q.eq("program_id", query.data.programId);
  if (query.data.channelId) q = q.eq("channel_id", query.data.channelId);
  if (query.data.status) q = q.eq("slot_status", query.data.status);
  if (query.data.visibility) q = q.eq("visibility", query.data.visibility);
  if (fromIso) q = q.gte("starts_at", fromIso);
  if (toIso) q = q.lte("starts_at", toIso);
  if (query.data.limit) q = q.limit(query.data.limit);

  const { data, error } = await q;
  if (error) {
    console.error("Program slots load error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "edit_catalog");
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(
    req,
    z.object({
      programId: z.string().min(1),
      channelId: z.string().nullable().optional(),
      startsAt: z.string(),
      endsAt: z.string().nullable().optional(),
      slotStatus: SlotStatus.optional(),
      visibility: SlotVisibility.optional(),
      notes: z.string().nullable().optional(),
    })
  );
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const startsAtIso = toIsoDate(body.startsAt);
  if (!startsAtIso) return invalidResponse();

  const endsAtIso =
    body.endsAt === undefined ? null : body.endsAt === null ? null : toIsoDate(body.endsAt);
  if (body.endsAt !== undefined && body.endsAt !== null && !endsAtIso) return invalidResponse();

  if (endsAtIso && endsAtIso <= startsAtIso) return invalidResponse();

  const { data: program, error: programError } = await ctx.sb
    .from("programs")
    .select("id, channel_id, status, published_at")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", body.programId)
    .maybeSingle();

  if (programError) {
      console.error("Program lookup for slot create error", {
        error: programError.message,
        tenantId: ctx.tenant_id,
        programId: body.programId,
      });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!program) return notFoundResponse();

  const now = new Date().toISOString();
  const effectiveChannelId = body.channelId ?? program.channel_id ?? null;
  const nextStatus = body.slotStatus ?? "scheduled";
  if (nextStatus !== "cancelled" && !effectiveChannelId) return missingChannelResponse();
  if (nextStatus !== "cancelled" && !endsAtIso) return missingEndResponse();

  if (effectiveChannelId && nextStatus !== "cancelled") {
    const { error: conflictLookupError, conflictId } = await findSlotConflict({
      sb: ctx.sb,
      tenantId: ctx.tenant_id,
      channelId: effectiveChannelId,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
    });
    if (conflictLookupError) {
        console.error("Program slot conflict lookup error", {
          error: conflictLookupError.message,
          tenantId: ctx.tenant_id,
          programId: body.programId,
        });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
    if (conflictId) return conflictResponse();
  }

  const { data, error } = await ctx.sb
    .from("program_slots")
    .insert({
      tenant_id: ctx.tenant_id,
      program_id: body.programId,
      channel_id: effectiveChannelId,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      slot_status: nextStatus,
      visibility: body.visibility ?? "public",
      notes: body.notes ?? null,
      created_by: ctx.user_id,
      updated_by: ctx.user_id,
      updated_at: now,
    })
    .select("*, program:programs(id,title,poster,status), channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    console.error("Program slot create error", { error: error.message, tenantId: ctx.tenant_id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  const nextProgramStatus = deriveProgramStatusFromSlotStatus(
    program.status as "draft" | "scheduled" | "published" | "cancelled",
    nextStatus
  );
  const syncProgramUpdate: Record<string, unknown> = {
    updated_at: now,
    updated_by: ctx.user_id,
  };

  if (nextProgramStatus !== program.status) {
    syncProgramUpdate.status = nextProgramStatus;
  }
  if (nextProgramStatus === "published") {
    syncProgramUpdate.published_at = program.published_at ?? now;
  }
  if (!program.channel_id && effectiveChannelId) {
    syncProgramUpdate.channel_id = effectiveChannelId;
  }

  if (Object.keys(syncProgramUpdate).length > 2) {
    const { error: syncProgramError } = await ctx.sb
      .from("programs")
      .update(syncProgramUpdate)
      .eq("tenant_id", ctx.tenant_id)
      .eq("id", body.programId);

    if (syncProgramError) {
      console.error("Program sync after slot create error", {
        error: syncProgramError.message,
        tenantId: ctx.tenant_id,
        programId: body.programId,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
  }

  await auditLog({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    action: data.slot_status === "published" ? "program_slot.publish" : "program_slot.create",
    targetType: "program_slot",
    targetId: data.id,
    metadata: {
      programId: data.program_id,
      channelId: data.channel_id,
      slotStatus: data.slot_status,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
    },
  });

  return NextResponse.json(data, { status: 201 });
}
