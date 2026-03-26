import { NextResponse } from "next/server";
import { z } from "zod";

import { setAuthCookies } from "../../../_utils/cookies";
import { enforceRateLimit, getRateLimitConfig } from "../../../_utils/rate-limit";
import { supabaseAdmin, supabaseAnon } from "../../../_utils/supabase";
import { parseJson } from "../../../_utils/validate";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function tableExists(admin: ReturnType<typeof supabaseAdmin>, tableName: string) {
  const { error } = await admin.from(tableName).select("*").limit(1);
  return !error;
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJson(
      req,
      z.object({
        email: z.string().email(),
        password: z
          .string()
          .min(12)
          .regex(/[a-z]/, "missing_lowercase")
          .regex(/[A-Z]/, "missing_uppercase")
          .regex(/\d/, "missing_number")
          .regex(/[^A-Za-z0-9]/, "missing_symbol"),
        fullName: z.string().trim().min(2).max(120).optional(),
      })
    );
    if (!parsed.ok) return parsed.res;

    const { email, password, fullName } = parsed.data;
    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const anon = supabaseAnon();
    const admin = supabaseAdmin();

    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password,
      options: fullName
        ? {
            data: {
              display_name: fullName.trim(),
            },
          }
        : undefined,
    });

    if (signUpError) {
      console.error("Web viewer signup error", { error: signUpError.message });
      return jsonError("Impossible de creer le compte.", 401);
    }

    const user = signUpData.user;
    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          requires_email_confirmation: true,
          message: "Compte cree. Verifiez votre email pour confirmer votre adresse.",
        },
        { status: 200 }
      );
    }

    if (fullName && (await tableExists(admin, "profiles"))) {
      const { error: profileError } = await admin.from("profiles").upsert(
        {
          user_id: user.id,
          tenant_id: null,
          full_name: fullName.trim(),
          avatar_url: null,
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        console.error("Web viewer signup profile sync error", {
          error: profileError.message,
          userId: user.id,
        });
      }
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Web viewer signup sign-in error", { error: signInError.message });
      return NextResponse.json(
        {
          ok: true,
          requires_email_confirmation: true,
          message: "Compte cree. Verifiez votre email pour confirmer votre adresse, puis connectez-vous.",
        },
        { status: 200 }
      );
    }

    const accessToken = signInData.session?.access_token;
    const refreshToken = signInData.session?.refresh_token;
    if (!accessToken || !refreshToken) {
      return jsonError("Session introuvable.", 500);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setAuthCookies(res, accessToken, refreshToken);
    return res;
  } catch (error: unknown) {
    console.error("Web viewer signup route error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError("Une erreur est survenue.", 500);
  }
}
