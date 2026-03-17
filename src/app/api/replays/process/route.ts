import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { processReplayGenerationJobs } from "../../_utils/replay-processor";
import { getTenantContext, jsonError, requireTenantCapability } from "../../tenant/_utils";
import { parseJson } from "../../_utils/validate";

const PROCESS_BODY_SCHEMA = z.object({
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx.ok) return ctx.res;

  const permission = await requireTenantCapability(ctx.sb, ctx.tenant_id, ctx.user_id, "operate_live");
  if (!permission.ok) return jsonError(permission.error, 403);

  const parsed = await parseJson(req, PROCESS_BODY_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const limit = parsed.data.limit ?? 1;

  const result = await processReplayGenerationJobs({
    sb: ctx.sb,
    tenantId: ctx.tenant_id,
    actorUserId: ctx.user_id,
    fallbackBaseUrl: req.nextUrl.origin,
    limit,
    includeFailed: true,
  });

  if (!result.ok) {
    console.error("Replay process jobs load error", {
      tenantId: ctx.tenant_id,
      error: result.error,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
