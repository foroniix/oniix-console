import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Operation indisponible.");
  }
}

export function supabaseAnon() {
  return createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_ANON_KEY());
}

// Service role: restricted to server-only admin operations.
export function supabaseAdmin() {
  assertServerOnly();
  return createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_SERVICE_ROLE_KEY());
}

export function supabaseUser(accessToken: string) {
  if (!accessToken || accessToken.trim().length < 20) {
    throw new Error("Missing user access token");
  }

  return createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_ANON_KEY(), {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
