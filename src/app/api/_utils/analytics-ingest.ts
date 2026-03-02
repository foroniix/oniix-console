import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

type IngestKeyMap = Record<string, string>;

let cachedRaw: string | null = null;
let cachedParsed: IngestKeyMap = {};

function parseJsonMap(raw: string): IngestKeyMap {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: IngestKeyMap = {};
    for (const [tenantId, value] of Object.entries(parsed)) {
      if (typeof tenantId !== "string" || typeof value !== "string") continue;
      const t = tenantId.trim();
      const k = value.trim();
      if (!t || !k) continue;
      out[t] = k;
    }
    return out;
  } catch {
    return {};
  }
}

function parseFlatMap(raw: string): IngestKeyMap {
  const out: IngestKeyMap = {};
  raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const idx = entry.indexOf(":");
      if (idx <= 0) return;
      const tenantId = entry.slice(0, idx).trim();
      const key = entry.slice(idx + 1).trim();
      if (!tenantId || !key) return;
      out[tenantId] = key;
    });
  return out;
}

function getParsedMap() {
  const raw = process.env.ANALYTICS_INGEST_KEYS ?? "";
  if (cachedRaw === raw) return cachedParsed;

  cachedRaw = raw;
  cachedParsed = raw.trim().startsWith("{") ? parseJsonMap(raw) : parseFlatMap(raw);
  return cachedParsed;
}

function safeEqual(left: string, right: string) {
  const l = Buffer.from(left);
  const r = Buffer.from(right);
  if (l.length !== r.length) return false;
  return timingSafeEqual(l, r);
}

export function resolveExpectedIngestKey(tenantId: string) {
  const tenantKey = getParsedMap()[tenantId];
  if (tenantKey && tenantKey.length > 0) return tenantKey;

  const globalKey = (process.env.ANALYTICS_INGEST_KEY ?? "").trim();
  if (globalKey) return globalKey;

  return null;
}

export function verifyIngestKey(tenantId: string, provided: string | null | undefined) {
  const expected = resolveExpectedIngestKey(tenantId);
  if (!expected || !provided) return false;
  const key = provided.trim();
  if (!key) return false;
  return safeEqual(expected, key);
}

export function generateIngestKey() {
  return randomBytes(32).toString("base64url");
}

export function hashIngestKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyHashedIngestKey(hash: string, provided: string | null | undefined) {
  if (!hash || !provided) return false;
  return safeEqual(hash.trim(), hashIngestKey(provided.trim()));
}
