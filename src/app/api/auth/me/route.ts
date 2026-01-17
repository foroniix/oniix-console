import { NextResponse } from "next/server";
import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;

    const sb = supabaseUser(ctx.accessToken);
    const user = ctx.user;

    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        access_token: ctx.accessToken,
        user: {
          id: user.id,
          email: user.email ?? null,
          role: ctx.role,
          tenant_id: ctx.tenantId,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Auth me error", { error: e?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
