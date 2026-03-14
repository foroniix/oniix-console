import { createClient } from "npm:@supabase/supabase-js@2";

import { env } from "./env.ts";

const authConfig = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, authConfig);
}

export function createUserClient(authorization: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...authConfig,
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}
