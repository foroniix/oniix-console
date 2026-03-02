import { NextResponse } from "next/server";
import {
  resolveExpectedIngestKey,
  verifyHashedIngestKey,
  verifyIngestKey,
} from "./analytics-ingest";
import { verifyIngestToken } from "./ingest-token";
import { supabaseAdmin } from "./supabase";

export const TENANT_INGEST_KEY_HEADER = "x-oniix-ingest";
export const TENANT_INGEST_TENANT_HEADER = "x-oniix-tenant";
export const TENANT_INGEST_TOKEN_HEADER = "x-oniix-token";

function isMissingTableError(code?: string | null) {
  return code === "42P01" || code === "PGRST205";
}

type TenantIngestAuthOk = {
  ok: true;
  tenantId: string;
  keySource: "db" | "env" | "token";
  streamId?: string;
};

type TenantIngestAuthErr = {
  ok: false;
  res: NextResponse;
};

export async function requireTenantIngestAuth(
  req: Request
): Promise<TenantIngestAuthOk | TenantIngestAuthErr> {
  const tenantId = (req.headers.get(TENANT_INGEST_TENANT_HEADER) ?? "").trim();
  const ingestKey = (req.headers.get(TENANT_INGEST_KEY_HEADER) ?? "").trim();
  const headerToken = (req.headers.get(TENANT_INGEST_TOKEN_HEADER) ?? "").trim();
  const authHeader = (req.headers.get("authorization") ?? "").trim();
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const ingestToken = headerToken || bearerToken;

  if (ingestToken) {
    const tokenRes = verifyIngestToken(ingestToken);
    if (!tokenRes.ok) {
      return {
        ok: false,
        res: NextResponse.json(
          { ok: false, error: "Authentification ingest invalide." },
          { status: 401 }
        ),
      };
    }

    const tokenTenantId = tokenRes.payload.tenant_id.trim();
    if (tenantId && tenantId !== tokenTenantId) {
      return {
        ok: false,
        res: NextResponse.json(
          { ok: false, error: "Authentification ingest invalide." },
          { status: 401 }
        ),
      };
    }

    return {
      ok: true,
      tenantId: tokenTenantId,
      keySource: "token",
      streamId: tokenRes.payload.stream_id?.trim() || undefined,
    };
  }

  if (!tenantId || !ingestKey) {
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, error: "Authentification ingest manquante." },
        { status: 401 }
      ),
    };
  }

  const admin = supabaseAdmin();
  const { data: keyRow, error: keyErr } = await admin
    .from("tenant_ingest_keys")
    .select("key_hash")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (keyErr && !isMissingTableError(keyErr.code)) {
    console.error("Tenant ingest auth key lookup error", {
      error: keyErr.message,
      code: keyErr.code,
      tenantId,
    });
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: "Une erreur est survenue." }, { status: 500 }),
    };
  }

  const hasDbKey = Boolean((keyRow as { key_hash?: string } | null)?.key_hash);
  const validDbKey = hasDbKey
    ? verifyHashedIngestKey((keyRow as { key_hash: string }).key_hash, ingestKey)
    : false;
  const validEnvKey = verifyIngestKey(tenantId, ingestKey);

  if (!validDbKey && !validEnvKey) {
    if (!hasDbKey && !resolveExpectedIngestKey(tenantId) && isMissingTableError(keyErr?.code ?? null)) {
      return {
        ok: false,
        res: NextResponse.json({ ok: false, error: "Ingest non configure." }, { status: 503 }),
      };
    }
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, error: "Authentification ingest invalide." },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true,
    tenantId,
    keySource: validDbKey ? "db" : "env",
  };
}
