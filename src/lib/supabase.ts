import { createClient } from "@supabase/supabase-js";

/* ---------------------------
   CLIENT PUBLIC (ANON)
   utilisé par analytics.ts
---------------------------- */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);


/* ---------------------------
   CLIENT ADMIN (SERVICE ROLE)
   réservé au backend
---------------------------- */
export function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false } }
  );
}
