import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, requireTenant } from "../../_utils/auth";
import { auditLog } from "../../_utils/audit";
import { canTransitionProgramStatus, isSlotActive } from "../../_utils/programming";
import { supabaseUser } from "../../_utils/supabase";
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

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

  const supa = supabaseUser(ctx.accessToken);
  const { data: current, error: currentError } = await supa
    .from("programs")
    .select("id, status, published_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Program lookup error", { error: currentError.message, tenantId: ctx.tenantId, id });
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
  const updateData: Record<string, unknown> = {
    updated_at: now,
    updated_by: ctx.userId,
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

  const { data, error } = await supa
    .from("programs")
    .update(updateData)
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select("*, channel:channels(id,name,logo,category)")
    .single();

  if (error) {
    if (isNotFound(error)) return notFoundResponse();
    console.error("Program update error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: body.status === "published" && current.status !== "published" ? "program.publish" : "program.update",
    targetType: "program",
    targetId: data.id,
    metadata: {
      previousStatus: current.status,
      nextStatus: data.status,
      changedFields: Object.keys(updateData),
    },
  });

  return NextResponse.json(data);
}

export async function DELETE(
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
    .from("programs")
    .select("id, status, title")
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("Program lookup before delete error", {
      error: currentError.message,
      tenantId: ctx.tenantId,
      id,
    });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
  if (!current) return notFoundResponse();

  if (current.status === "published") {
    const nowIso = new Date().toISOString();
    const { data: slots, error: slotsError } = await supa
      .from("program_slots")
      .select("id, slot_status, ends_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("program_id", id)
      .in("slot_status", ["scheduled", "published"]);

    if (slotsError) {
      console.error("Program active slots lookup error", {
        error: slotsError.message,
        tenantId: ctx.tenantId,
        id,
      });
      return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }

    const hasActiveSlots = (slots ?? []).some((slot) =>
      isSlotActive(slot.slot_status as "scheduled" | "published" | "cancelled", slot.ends_at, nowIso)
    );
    if (hasActiveSlots) return activeSlotsConflictResponse();
  }

  const { data, error } = await supa
    .from("programs")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Program delete error", { error: error.message, tenantId: ctx.tenantId, id });
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!data) return notFoundResponse();

  await auditLog({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
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
