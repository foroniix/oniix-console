import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireAuth, requireRole } from "../../_utils/auth";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  const rateLimit = getRateLimitConfig("ADMIN", { limit: 20, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit, ctx.userId);
  if (rateRes) return rateRes;

  try {
    const { id } = await params;
    const supa = supabaseAdmin();

    const { error } = await supa.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("User delete error", { error: err?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
