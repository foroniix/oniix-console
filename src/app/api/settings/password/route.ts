import { NextResponse } from "next/server";
import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const body = await req.json().catch(() => ({}));
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Mot de passe trop court (min 8)" }, { status: 400 });
  }

  const sb = supabaseUser(ctx.accessToken);


  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
