import { NextResponse } from "next/server";

import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  try {
    const sb = supabaseUser(ctx.accessToken);
    const { error } = await sb
      .from("user_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", ctx.userId)
      .eq("is_read", false);

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("notifications_read_all_failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId: ctx.userId,
    });
    return NextResponse.json({ ok: false, error: "Impossible de marquer les notifications comme lues." }, { status: 500 });
  }
}
