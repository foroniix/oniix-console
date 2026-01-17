import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext, jsonError, requireTenantAdmin } from "../_utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_PAGE_SIZE = 50;

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
    let query = ctx.sb
      .from("audit_logs")
      .select("id,actor_user_id,action,target_type,target_id,metadata,created_at", { count: "exact" })
      .eq("tenant_id", ctx.tenant_id)
      .order("created_at", { ascending: false });

    if (action) query = query.eq("action", action);
    if (q) {
      const safeQ = q.replaceAll("%", "").replaceAll("_", "");
      query = query.or(`action.ilike.%${safeQ}%,target_type.ilike.%${safeQ}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("Audit logs load error", { error: error.message });
      return jsonError("Impossible de charger le journal.", 400);
    }

    return NextResponse.json(
      { ok: true, logs: data ?? [], page, pageSize, total: count ?? 0 },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Audit logs load exception", { error: error?.message });
    return jsonError("Impossible de charger le journal.", 400);
  }
}
