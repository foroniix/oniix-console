export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length < 10) {
    console.error("Missing or invalid env var", { name });
    throw new Error("Configuration indisponible.");
  }
  return v;
}

export const ENV = {
  SUPABASE_URL: () => requireEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

  ACCESS_COOKIE_NAME: () => process.env.ACCESS_TOKEN_COOKIE_NAME || "oniix-access-token",
  REFRESH_COOKIE_NAME: () => process.env.REFRESH_TOKEN_COOKIE_NAME || "oniix-refresh-token",
};
