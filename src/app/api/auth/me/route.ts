import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser } from "../../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const sb = supabaseUser(token);
    const { data, error } = await sb.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: error?.message || "Invalid session" }, { status: 401 });
    }

    const user = data.user;

    const tenant_id =
      (user.app_metadata as any)?.tenant_id ??
      (user.user_metadata as any)?.tenant_id ??
      null;

    const role =
      (user.app_metadata as any)?.role ??
      (user.user_metadata as any)?.role ??
      null;

    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        access_token: token, // ✅ nécessaire pour Supabase Realtime + RLS côté browser
        user: {
          id: user.id,
          email: user.email ?? null,
          role,
          tenant_id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
