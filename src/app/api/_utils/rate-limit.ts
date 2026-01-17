import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

type RateLimitConfig = {
  namespace: string;
  limit: number;
  windowMs: number;
};

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    redisClient = Redis.fromEnv();
    return redisClient;
  } catch (error) {
    console.error("Rate limit misconfigured", { error });
    return null;
  }
}

function normalizeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export function getRateLimitConfig(namespace: string, defaults: { limit: number; windowMs: number }) {
  const limitEnv = process.env[`RATE_LIMIT_${namespace}_LIMIT`];
  const windowEnv =
    process.env[`RATE_LIMIT_${namespace}_WINDOW_MS`] ?? process.env.RATE_LIMIT_WINDOW_MS;

  return {
    namespace,
    limit: normalizeNumber(limitEnv, defaults.limit),
    windowMs: normalizeNumber(windowEnv, defaults.windowMs),
  };
}

function getClientKey(req: Request, userId?: string | null) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const user = userId ? String(userId) : "anon";
  return `${ip}:${user}`;
}

export async function enforceRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId?: string | null
) {
  const redis = getRedis();
  if (!redis) return null;

  const key = `rate:${config.namespace}:${getClientKey(req, userId)}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, config.windowMs);
    }

    if (count > config.limit) {
      const ttl = await redis.pttl(key);
      const res = NextResponse.json(
        { error: "Trop de requetes. Veuillez reessayer dans un instant." },
        { status: 429 }
      );
      if (ttl > 0) res.headers.set("Retry-After", String(Math.ceil(ttl / 1000)));
      console.warn("Rate limit exceeded", { key, count, limit: config.limit });
      return res;
    }
  } catch (error) {
    console.error("Rate limit error", { error });
  }

  return null;
}
