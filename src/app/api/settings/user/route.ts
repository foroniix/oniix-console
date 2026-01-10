import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser } from "../../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

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

  return NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        tenant_id,
        role,
      },
    },
    { status: 200 }
  );
}
