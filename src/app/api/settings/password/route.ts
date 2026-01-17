import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../_utils/auth";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const rateLimit = getRateLimitConfig("RESET", { limit: 5, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit, ctx.userId);
  if (rateRes) return rateRes;

  const parsed = await parseJson(
    req,
    z.object({
      newPassword: z.string().min(8),
    })
  );
  if (!parsed.ok) return parsed.res;
  const { newPassword } = parsed.data;

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, error: "Mot de passe trop court (min 8)" }, { status: 400 });
  }

  const sb = supabaseUser(ctx.accessToken);

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("Password update error", { error: error.message, userId: ctx.userId });
    return NextResponse.json(
      { ok: false, error: "Impossible de mettre a jour le mot de passe." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
