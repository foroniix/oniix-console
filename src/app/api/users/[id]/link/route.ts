import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "../../../_utils/supabase";
import { requireAuth, requireRole } from "../../../_utils/auth";
import { parseJson } from "../../../_utils/validate";
import { enforceRateLimit, getRateLimitConfig } from "../../../_utils/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;

  const roleErr = requireRole(ctx, ["superadmin"]);
  if (roleErr) return roleErr;

  try {
    const rateLimit = getRateLimitConfig("ADMIN", { limit: 20, windowMs: 60_000 });
    const rateRes = await enforceRateLimit(req, rateLimit, ctx.userId);
    if (rateRes) return rateRes;

    const { id } = await params;
    const parsed = await parseJson(
      req,
      z.object({
        redirectTo: z.string().url().optional(),
      })
    );
    if (!parsed.ok) return parsed.res;
    const body = parsed.data;
    const redirectTo =
      body?.redirectTo ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/`;

    const supa = supabaseAdmin();

    const { data: u, error: uErr } = await supa.auth.admin.getUserById(id);
    if (uErr) throw uErr;
    const email = u?.user?.email;
    if (!email) return NextResponse.json({ ok: false, error: "Impossible de generer le lien." }, { status: 400 });

    const { data, error } = await supa.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error) throw error;

    const link = (data as any)?.properties?.action_link || (data as any)?.action_link;
    if (!link) return NextResponse.json({ ok: false, error: "Impossible de generer le lien." }, { status: 500 });

    return NextResponse.json({ ok: true, link });
  } catch (err: any) {
    console.error("User link error", { error: err?.message });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
