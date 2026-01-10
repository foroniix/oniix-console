import { createClient } from "@supabase/supabase-js";

export function supabaseBrowser(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const sb = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 20 },
    },
  });

  // ✅ indispensable : Realtime respecte RLS uniquement si on set le JWT
  sb.realtime.setAuth(accessToken);

  return sb;
}
