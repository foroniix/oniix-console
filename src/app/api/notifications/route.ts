import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "../_utils/auth";
import { mapNotificationRow, syncSystemNotifications } from "../_utils/notifications";
import { supabaseUser } from "../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, rawLimit)) : 12;

  try {
    await syncSystemNotifications(ctx);

    const sb = supabaseUser(ctx.accessToken);
    const [listRes, unreadRes] = await Promise.all([
      sb
        .from("user_notifications")
        .select(
          "id,kind,severity,title,body,action_label,action_url,dedupe_key,metadata,is_read,read_at,created_at"
        )
        .eq("user_id", ctx.userId)
        .order("is_read", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit),
      sb
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.userId)
        .eq("is_read", false),
    ]);

    if (listRes.error) {
      if (isMissingTableError(listRes.error.code)) {
        return NextResponse.json({ ok: true, unreadCount: 0, notifications: [] }, { status: 200 });
      }
      throw listRes.error;
    }

    if (unreadRes.error && !isMissingTableError(unreadRes.error.code)) {
      throw unreadRes.error;
    }

    return NextResponse.json(
      {
        ok: true,
        unreadCount: Number(unreadRes.count ?? 0),
        notifications: (listRes.data ?? []).map((row) => mapNotificationRow(row)),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("notifications_list_failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId: ctx.userId,
    });
    return NextResponse.json({ ok: false, error: "Impossible de charger les notifications." }, { status: 500 });
  }
}
