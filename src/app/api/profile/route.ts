import { NextResponse } from "next/server";
import { requireAuth } from "../_utils/auth";
import { supabaseUser } from "../_utils/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;
    const sb = supabaseUser(ctx.accessToken);

    // Lire profile
    const { data: profile, error } = await sb
      .from("profiles")
      .select("user_id, tenant_id, full_name, avatar_url")
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json(
      {
        ok: true,
        profile: profile ?? {
          user_id: ctx.userId,
          tenant_id: null,
          full_name: null,
          avatar_url: null,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth();
    if ("res" in auth) return auth.res;
    const { ctx } = auth;
    const sb = supabaseUser(ctx.accessToken);

    const body = await req.json().catch(() => ({}));
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : null;
    const avatar_url = typeof body.avatar_url === "string" ? body.avatar_url.trim() : null;

    // tenant_id depuis metadata user (optionnel)
    const payload: any = {
      user_id: ctx.userId,
      tenant_id: ctx.tenantId,
      full_name: full_name && full_name.length ? full_name : null,
      avatar_url: avatar_url && avatar_url.length ? avatar_url : null,
    };

    // UPSERT
    const { data: profile, error } = await sb
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id, tenant_id, full_name, avatar_url")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
