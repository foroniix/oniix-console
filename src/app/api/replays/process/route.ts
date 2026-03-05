import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAuth, requireTenant } from "../../_utils/auth";
import { processReplayGenerationJobs } from "../../_utils/replay-processor";
import { supabaseUser } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

const PROCESS_BODY_SCHEMA = z.object({
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("res" in auth) return auth.res;
  const { ctx } = auth;
  const tenantErr = await requireTenant(ctx);
  if (tenantErr) return tenantErr;

  const parsed = await parseJson(req, PROCESS_BODY_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const limit = parsed.data.limit ?? 1;
  const supa = supabaseUser(ctx.accessToken);

  const result = await processReplayGenerationJobs({
    sb: supa,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    fallbackBaseUrl: req.nextUrl.origin,
    limit,
    includeFailed: true,
  });

  if (!result.ok) {
    console.error("Replay process jobs load error", {
      tenantId: ctx.tenantId,
      error: result.error,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
