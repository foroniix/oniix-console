import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { read?: boolean } | null;
    const nextRead = body?.read !== false;

    const sb = supabaseUser(ctx.accessToken);
    const { data, error } = await sb
      .from("user_notifications")
      .update({
        is_read: nextRead,
        read_at: nextRead ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", ctx.userId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: "Notification introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("notification_update_failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId: ctx.userId,
    });
    return NextResponse.json({ ok: false, error: "Impossible de mettre à jour la notification." }, { status: 500 });
  }
}
