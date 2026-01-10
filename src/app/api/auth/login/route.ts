import { NextResponse } from "next/server";
import { supabaseAnon } from "../../_utils/supabase";
import { setAuthCookies } from "../../_utils/cookies";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) return jsonError("Email et mot de passe requis", 400);

    const sb = supabaseAnon();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) return jsonError(error.message, 401);

    const access = data.session?.access_token;
    const refresh = data.session?.refresh_token;
    if (!access || !refresh) return jsonError("Session introuvable", 500);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (e: any) {
    return jsonError(e?.message || "Erreur serveur", 500);
  }
}
