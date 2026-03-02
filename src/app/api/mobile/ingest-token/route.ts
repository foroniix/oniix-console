import { NextResponse } from "next/server";
import { z } from "zod";
import { createIngestToken } from "../../_utils/ingest-token";
import { enforceRateLimit, getRateLimitConfig } from "../../_utils/rate-limit";
import { supabaseAdmin } from "../../_utils/supabase";
import { parseJson } from "../../_utils/validate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_SCHEMA = z.object({
  stream_id: z.string().min(1),
  tenant_id: z.string().optional(),
  ttl_sec: z.number().int().min(30).max(900).optional(),
});

export async function POST(req: Request) {
  const rateLimit = getRateLimitConfig("MOBILE_INGEST_TOKEN", { limit: 120, windowMs: 60_000 });
  const rateRes = await enforceRateLimit(req, rateLimit);
  if (rateRes) return rateRes;

  const parsed = await parseJson(req, REQUEST_SCHEMA);
  if (!parsed.ok) return parsed.res;

  const streamId = parsed.data.stream_id.trim();
  const requestedTenantId = parsed.data.tenant_id?.trim() ?? "";
  const ttlSec = parsed.data.ttl_sec;

  const admin = supabaseAdmin();
  const { data: stream, error: streamError } = await admin
    .from("streams")
    .select("id, tenant_id")
    .eq("id", streamId)
    .maybeSingle();

  if (streamError) {
    console.error("Mobile ingest token stream lookup error", {
      error: streamError.message,
      code: streamError.code,
      streamId,
    });
    return NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 });
  }

  if (!stream) {
    return NextResponse.json({ ok: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const tenantId = String((stream as { tenant_id?: string | null }).tenant_id ?? "").trim();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Configuration invalide." }, { status: 500 });
  }

  if (requestedTenantId && requestedTenantId !== tenantId) {
    return NextResponse.json({ ok: false, error: "Authentification ingest invalide." }, { status: 401 });
  }

  const tokenRes = createIngestToken({
    tenantId,
    streamId,
    ttlSec: ttlSec ?? null,
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ ok: false, error: "Ingest non configure." }, { status: 503 });
  }

  return NextResponse.json(
    {
      ok: true,
      tenant_id: tenantId,
      stream_id: streamId,
      token: tokenRes.token,
      ttl_sec: tokenRes.ttlSec,
      expires_at: tokenRes.expiresAt,
    },
    { status: 200 }
  );
}
