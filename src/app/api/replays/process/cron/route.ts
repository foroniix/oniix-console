import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { processReplayGenerationJobs } from "../../../_utils/replay-processor";
import { supabaseAdmin } from "../../../_utils/supabase";
import { parseQuery } from "../../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUERY_SCHEMA = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

function getCronSecret() {
  const direct = (process.env.REPLAY_PROCESS_CRON_SECRET ?? "").trim();
  if (direct) return direct;
  return (process.env.CRON_SECRET ?? "").trim();
}

function readBearerToken(req: NextRequest) {
  const auth = (req.headers.get("authorization") ?? "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

function authorized(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return false;
  const bearer = readBearerToken(req);
  const header = (req.headers.get("x-replay-process-secret") ?? "").trim();
  return bearer === secret || header === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Authentification invalide." }, { status: 401 });
  }

  const parsed = parseQuery(req, QUERY_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const limit = parsed.data.limit ?? 5;

  const result = await processReplayGenerationJobs({
    sb: supabaseAdmin(),
    fallbackBaseUrl:
      (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? req.nextUrl.origin).replace(
        /\/$/,
        ""
      ),
    limit,
    includeFailed: true,
  });

  if (!result.ok) {
    console.error("Replay process cron error", { error: result.error, limit });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
