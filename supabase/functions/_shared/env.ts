function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number) {
  const raw = Deno.env.get(name)?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  streamBaseUrl: requireEnv("STREAM_BASE_URL"),
  hlsTokenSecret: requireEnv("HLS_TOKEN_SECRET"),
  workerResolveOriginSecret: requireEnv("WORKER_RESOLVE_ORIGIN_SECRET"),
  originRefSecret: requireEnv("ORIGIN_REF_SECRET"),
  internalJobSecret: requireEnv("INTERNAL_JOB_SECRET"),
  playbackTokenTtlSec: optionalNumber("PLAYBACK_TOKEN_TTL_SEC", 90),
  presenceWindowSeconds: optionalNumber("PRESENCE_WINDOW_SECONDS", 35),
  healthcheckTimeoutMs: optionalNumber("CHANNEL_HEALTH_TIMEOUT_MS", 6000),
};
