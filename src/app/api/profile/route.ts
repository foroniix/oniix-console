import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser } from "../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const sb = supabaseUser(token);
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    // Lire profile
    const { data: profile, error } = await sb
      .from("profiles")
      .select("user_id, tenant_id, full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json(
      {
        ok: true,
        profile: profile ?? {
          user_id: user.id,
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
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const sb = supabaseUser(token);
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : null;
    const avatar_url = typeof body.avatar_url === "string" ? body.avatar_url.trim() : null;

    // tenant_id depuis metadata user (optionnel)
    const tenant_id =
      (user.app_metadata as any)?.tenant_id ??
      (user.user_metadata as any)?.tenant_id ??
      null;

    const payload: any = {
      user_id: user.id,
      tenant_id,
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
