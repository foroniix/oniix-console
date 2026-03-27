import { NextResponse } from "next/server";

import { requireAuth } from "@/app/api/_utils/auth";
import { supabaseUser } from "@/app/api/_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const sb = supabaseUser(ctx.accessToken);
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: ctx.user.id,
          email: ctx.user.email ?? null,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Web viewer me error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
