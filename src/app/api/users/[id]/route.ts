import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../_utils/supabase";
import { requireAuth, requireRole } from "../../_utils/auth";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  try {
    const { id } = await params;
    const supa = supabaseAdmin();

    const { error } = await supa.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Internal Error" }, { status: 500 });
  }
}
