import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

/**
 * Client "anon" (clé publique) - utile pour login/signup côté serveur.
 */
export function supabaseAnon() {
  return createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_ANON_KEY());
}

/**
 * Client "admin" (service role) - DANGEREUX: server only.
 * Utilisé pour updateUserById, gérer tenants, etc.
 */
export function supabaseAdmin() {
  return createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_SERVICE_ROLE_KEY());
}

/**
 * Client "user-scoped" : exécute les requêtes au nom de l'utilisateur,
 * donc RLS s'applique correctement.
 *
 * IMPORTANT: accessToken doit venir des cookies httpOnly (server routes).
 */
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
