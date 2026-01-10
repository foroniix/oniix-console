import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUser } from "../../_utils/supabase";

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Mot de passe trop court (min 8)" }, { status: 400 });
  }

  const sb = supabaseUser(token);

  // Nécessite un user authentifié
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
