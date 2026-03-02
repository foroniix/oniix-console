import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_INGEST_TOKEN_TTL_SEC = 300;
const MIN_INGEST_TOKEN_TTL_SEC = 30;
const MAX_INGEST_TOKEN_TTL_SEC = 900;

type IngestTokenPayload = {
  scope: "ingest";
  tenant_id: string;
  stream_id?: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const l = Buffer.from(left);
  const r = Buffer.from(right);
  if (l.length !== r.length) return false;
  return timingSafeEqual(l, r);
}

function signPayload(payloadEncoded: string, secret: string) {
  const digest = createHmac("sha256", secret).update(payloadEncoded).digest();
  return base64UrlEncode(digest);
}

function resolveIngestTokenSecret() {
  const direct = (process.env.ANALYTICS_INGEST_TOKEN_SECRET ?? "").trim();
  if (direct) return direct;

  const nextAuth = (process.env.NEXTAUTH_SECRET ?? "").trim();
  if (nextAuth) return nextAuth;

  const legacy = (process.env.ANALYTICS_INGEST_KEY ?? "").trim();
  if (legacy) return legacy;

  // Zero-touch fallback: uses an existing server-only secret.
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? "").trim();
  if (serviceRole) return serviceRole;

  return null;
}

function clampTtlSec(input?: number | null) {
  if (!Number.isFinite(input)) return DEFAULT_INGEST_TOKEN_TTL_SEC;
  const rounded = Math.round(input as number);
  if (rounded < MIN_INGEST_TOKEN_TTL_SEC) return MIN_INGEST_TOKEN_TTL_SEC;
  if (rounded > MAX_INGEST_TOKEN_TTL_SEC) return MAX_INGEST_TOKEN_TTL_SEC;
  return rounded;
}

export function createIngestToken(input: { tenantId: string; streamId?: string | null; ttlSec?: number | null }) {
  const secret = resolveIngestTokenSecret();
  if (!secret) {
    return { ok: false as const, error: "Ingest token secret is not configured." };
  }

  const tenantId = (input.tenantId ?? "").trim();
  if (!tenantId) {
    return { ok: false as const, error: "Missing tenant id." };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = clampTtlSec(input.ttlSec);
  const exp = nowSec + ttlSec;

  const payload: IngestTokenPayload = {
    scope: "ingest",
    tenant_id: tenantId,
    iat: nowSec,
    exp,
  };

  const streamId = (input.streamId ?? "").trim();
  if (streamId) payload.stream_id = streamId;

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded, secret);
  const token = `${payloadEncoded}.${signature}`;

  return {
    ok: true as const,
    token,
    payload,
    ttlSec,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyIngestToken(token: string | null | undefined) {
  const secret = resolveIngestTokenSecret();
  if (!secret) {
    return { ok: false as const, error: "Ingest token secret is not configured." };
  }
  const value = (token ?? "").trim();
  if (!value) return { ok: false as const, error: "Missing token." };

  const [payloadEncoded, signature] = value.split(".");
  if (!payloadEncoded || !signature) return { ok: false as const, error: "Malformed token." };

  const expected = signPayload(payloadEncoded, secret);
  if (!safeEqual(expected, signature)) {
    return { ok: false as const, error: "Invalid signature." };
  }

  let parsed: IngestTokenPayload;
  try {
    parsed = JSON.parse(base64UrlDecode(payloadEncoded)) as IngestTokenPayload;
  } catch {
    return { ok: false as const, error: "Invalid payload." };
  }

  if (parsed.scope !== "ingest") return { ok: false as const, error: "Invalid scope." };
  if (!parsed.tenant_id || typeof parsed.tenant_id !== "string") {
    return { ok: false as const, error: "Missing tenant in token." };
  }
  if (!parsed.exp || typeof parsed.exp !== "number") {
    return { ok: false as const, error: "Missing expiration." };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSec) return { ok: false as const, error: "Token expired." };

  return { ok: true as const, payload: parsed };
}
