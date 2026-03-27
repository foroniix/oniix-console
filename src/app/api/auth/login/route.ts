import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAnon } from "../../_utils/supabase";
import { setAuthCookies } from "../../_utils/cookies";
import { parseJson } from "../../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";
import { hasConsoleAccess } from "@/lib/console-access";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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
    const { email, password } = parsed.data;

    if (!email || !password) return jsonError("Email et mot de passe requis.", 400);

    const rateLimit = getRateLimitConfig("AUTH", { limit: 10, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit);
    if (rateRes) return rateRes;

    const sb = supabaseAnon();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      console.warn("Login failed", { error: error.message });
      return jsonError("Identifiants invalides.", 401);
    }

    const access = data.session?.access_token;
    const refresh = data.session?.refresh_token;
    if (!access || !refresh) return jsonError("Session introuvable.", 500);

    const appMetadata = (data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const role = typeof appMetadata.role === "string" ? appMetadata.role : null;
    const tenantId = typeof appMetadata.tenant_id === "string" ? appMetadata.tenant_id : null;

    if (
      !data.user ||
      !(await hasConsoleAccess({
        accessToken: access,
        userId: data.user.id,
        tenantId,
        role,
        user: data.user,
      }))
    ) {
      return jsonError("Ce compte n'a pas acces a la console multi-tenant.", 403);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setAuthCookies(res, access, refresh);
    return res;
  } catch (error: unknown) {
    console.error("Login error", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return jsonError("Une erreur est survenue.", 500);
  }
}
