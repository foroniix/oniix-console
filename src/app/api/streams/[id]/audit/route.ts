import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireTenantAccess } from "../../../tenant/_utils";
import { parseQuery } from "../../../_utils/validate";

type Params = { params: Promise<{ id: string }> };

const QUERY_SCHEMA = z.object({
  limit: z.coerce.number().int().min(5).max(100).optional(),
});

const ACTOR_SELECT_ATTEMPTS = [
  {
    select: "id,actor_user_id,action,target_type,target_id,metadata,created_at",
    actorKey: "actor_user_id",
  },
  {
    select: "id,actor_id,action,target_type,target_id,metadata,created_at",
    actorKey: "actor_id",
  },
  {
    select: "id,user_id,action,target_type,target_id,metadata,created_at",
    actorKey: "user_id",
  },
] as const;

function isMissingColumnError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("column") ||
    m.includes("schema cache")
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requireTenantAccess("view_analytics");
  if (!ctx.ok) return ctx.res;

  const { id } = await params;
  const query = parseQuery(req, QUERY_SCHEMA);
  if (!query.ok) return query.res;

  const limit = query.data.limit ?? 30;
  const { data: stream, error: streamError } = await ctx.sb
    .from("streams")
    .select("id")
    .eq("tenant_id", ctx.tenant_id)
    .eq("id", id)
    .single();

  if (streamError || !stream) {
    if (streamError) {
      console.error("Stream audit lookup error", {
        error: streamError.message,
        tenantId: ctx.tenant_id,
        id,
      });
    }
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  let data: Array<Record<string, unknown>> | null = null;
  let error: { message: string } | null = null;
  let actorKey: "actor_user_id" | "actor_id" | "user_id" = "actor_user_id";

  for (const attempt of ACTOR_SELECT_ATTEMPTS) {
    const result = await ctx.sb
      .from("audit_logs")
      .select(attempt.select)
      .eq("tenant_id", ctx.tenant_id)
      .eq("target_type", "stream")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!result.error) {
      data = (result.data ?? []) as Array<Record<string, unknown>>;
      error = null;
      actorKey = attempt.actorKey;
      break;
    }

    error = result.error;
    if (!isMissingColumnError(result.error.message)) break;
  }

  if (error) {
    console.error("Stream audit load error", { error: error.message, tenantId: ctx.tenant_id, id });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  const normalizedLogs = (data ?? []).map((row) => ({
    ...row,
    actor_user_id: (row.actor_user_id ?? row[actorKey] ?? null) as string | null,
  }));

  return NextResponse.json(
    {
      ok: true,
      logs: normalizedLogs,
    },
    { status: 200 }
  );
}
