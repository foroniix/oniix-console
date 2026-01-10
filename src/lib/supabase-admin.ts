// admin/src/lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client côté Admin
 * - utilise la SERVICE_ROLE KEY
 * - pas de persistSession
 * - accès total aux RLS et tables protégées
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!;

  if (!url || !key) {
    throw new Error(
      "❌ Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        "X-Admin-Access": "true", // utile pour tes logs ou règles personnalisées
      },
    },
  });
}
