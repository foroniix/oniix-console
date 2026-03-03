import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext, jsonError, requireTenantAdmin } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PAGE_SIZE = 50;
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

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  if (!ctx.tenant_id) return jsonError("Acces refuse.", 403);

  const check = await requireTenantAdmin(ctx.sb, ctx.tenant_id, ctx.user.id);
  if (!check.ok) return jsonError(check.error, check.error === "Acces refuse." ? 403 : 400);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(5, Number(searchParams.get("pageSize") || "20"))
  );
  const q = (searchParams.get("q") || "").trim();
  const action = (searchParams.get("action") || "").trim();

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let data: Array<Record<string, unknown>> | null = null;
    let count = 0;
    let error: { message: string } | null = null;
    let actorKey: "actor_user_id" | "actor_id" | "user_id" = "actor_user_id";

    for (const attempt of ACTOR_SELECT_ATTEMPTS) {
      let query = ctx.sb
        .from("audit_logs")
        .select(attempt.select, { count: "exact" })
        .eq("tenant_id", ctx.tenant_id)
        .order("created_at", { ascending: false });

      if (action) query = query.eq("action", action);
      if (q) {
        const safeQ = q.replaceAll("%", "").replaceAll("_", "");
        query = query.or(`action.ilike.%${safeQ}%,target_type.ilike.%${safeQ}%`);
      }

      const result = await query.range(from, to);
      if (!result.error) {
        data = (result.data ?? []) as Array<Record<string, unknown>>;
        count = result.count ?? 0;
        error = null;
        actorKey = attempt.actorKey;
        break;
      }

      error = result.error;
      if (!isMissingColumnError(result.error.message)) break;
    }

    if (error) {
      console.error("Audit logs load error", { error: error.message });
      return jsonError("Impossible de charger le journal.", 400);
    }

    const logs = (data ?? []).map((row) => ({
      ...row,
      actor_user_id: (row.actor_user_id ?? row[actorKey] ?? null) as string | null,
    }));

    return NextResponse.json(
      { ok: true, logs, page, pageSize, total: count },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Audit logs load exception", { error: message });
    return jsonError("Impossible de charger le journal.", 400);
  }
}
