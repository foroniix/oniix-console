import {
  decodeBase64UrlToBytes,
  decodeJsonBase64Url,
  encodeBase64UrlBytes,
  encodeJsonBase64Url,
  utf8ToBytes,
} from "./base64url.ts";

export type PlaybackTokenPayload = {
  v: 1;
  exp: number;
  cid: string;
  sid: string;
  did?: string;
  path?: string;
};

type CreatePlaybackTokenInput = {
  secret: string;
  channelId: string;
  sessionId: string;
  deviceId?: string | null;
  ttlSec?: number | null;
  path?: string | null;
  nowEpochSec?: number;
};

type VerifyPlaybackTokenInput = {
  token: string;
  secret: string;
  channelId: string;
  expectedPath?: string | null;
  nowEpochSec?: number;
};

const DEFAULT_TTL_SEC = 90;
const MIN_TTL_SEC = 60;
const MAX_TTL_SEC = 120;

function clampTtlSec(ttlSec?: number | null) {
  if (!Number.isFinite(ttlSec)) return DEFAULT_TTL_SEC;
  const rounded = Math.round(ttlSec as number);
  if (rounded < MIN_TTL_SEC) return MIN_TTL_SEC;
  if (rounded > MAX_TTL_SEC) return MAX_TTL_SEC;
  return rounded;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    utf8ToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", utf8ToBytes(value));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payloadEncoded: string, secret: string) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, utf8ToBytes(payloadEncoded));
  return encodeBase64UrlBytes(new Uint8Array(signature));
}

export async function createPlaybackToken(input: CreatePlaybackTokenInput) {
  const ttlSec = clampTtlSec(input.ttlSec);
  const nowEpochSec = input.nowEpochSec ?? Math.floor(Date.now() / 1000);
  const exp = nowEpochSec + ttlSec;

  const payload: PlaybackTokenPayload = {
    v: 1,
    exp,
    cid: input.channelId,
    sid: input.sessionId,
  };

  if (input.deviceId?.trim()) {
    payload.did = await sha256Hex(input.deviceId.trim());
  }
  if (input.path?.trim()) {
    payload.path = input.path.trim();
  }

  const payloadEncoded = encodeJsonBase64Url(payload);
  const signature = await signPayload(payloadEncoded, input.secret);

  return {
    token: `${payloadEncoded}.${signature}`,
    payload,
    ttlSec,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export async function verifyPlaybackToken(input: VerifyPlaybackTokenInput) {
  const value = input.token.trim();
  if (!value) {
    return { ok: false as const, error: "Missing token." };
  }

  const [payloadEncoded, signature] = value.split(".");
  if (!payloadEncoded || !signature) {
    return { ok: false as const, error: "Malformed token." };
  }

  const key = await importHmacKey(input.secret);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64UrlToBytes(signature),
    utf8ToBytes(payloadEncoded)
  );
  if (!isValid) {
    return { ok: false as const, error: "Invalid signature." };
  }

  let payload: PlaybackTokenPayload;
  try {
    payload = decodeJsonBase64Url<PlaybackTokenPayload>(payloadEncoded);
  } catch {
    return { ok: false as const, error: "Invalid payload." };
  }

  const nowEpochSec = input.nowEpochSec ?? Math.floor(Date.now() / 1000);
  if (payload.v !== 1) return { ok: false as const, error: "Unsupported token version." };
  if (!payload.cid || !payload.sid) return { ok: false as const, error: "Incomplete token." };
  if (payload.exp <= nowEpochSec) return { ok: false as const, error: "Token expired." };
  if (payload.cid !== input.channelId) return { ok: false as const, error: "Channel mismatch." };
  if (payload.path && input.expectedPath && payload.path !== input.expectedPath) {
    return { ok: false as const, error: "Path mismatch." };
  }

  return {
    ok: true as const,
    payload,
  };
}
