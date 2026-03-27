import { NextResponse } from "next/server";
import { z } from "zod";

import { setAuthCookies } from "@/app/api/_utils/cookies";
import { enforceRateLimit, getRateLimitConfig } from "@/app/api/_utils/rate-limit";
import { supabaseAnon } from "@/app/api/_utils/supabase";
import { parseJson } from "@/app/api/_utils/validate";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJson(
      req,
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    );
    if (!parsed.ok) return parsed.res;

    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const anon = supabaseAnon();
    const { data, error } = await anon.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      console.warn("Web viewer login failed", { error: error.message });
      return jsonError("Identifiants invalides.", 401);
    }

    const accessToken = data.session?.access_token;
    const refreshToken = data.session?.refresh_token;
    if (!accessToken || !refreshToken) {
      return jsonError("Session introuvable.", 500);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setAuthCookies(res, accessToken, refreshToken);
    return res;
  } catch (error: unknown) {
    console.error("Web viewer login error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError("Une erreur est survenue.", 500);
  }
}
