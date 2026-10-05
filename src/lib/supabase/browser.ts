import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-only Supabase client used for authentication.
 *
 * This deliberately uses the project's public/anon key, never the service-role
 * key. Database access remains on the server-side API layer.
 */
let browserClient: SupabaseClient | null = null;

function getBrowserCredentials(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Google orqali kirish hali sozlanmagan. NEXT_PUBLIC_SUPABASE_URL va NEXT_PUBLIC_SUPABASE_ANON_KEY ni kiriting.");
  }

  return { url, key };
}

/** True when the public values required to initialize browser auth are present. */
export function hasSupabaseBrowserCredentials(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Returns one browser client per tab. It is intentionally lazy so the public
 * site continues to work when authentication has not been configured yet.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client faqat brauzerda ishlatiladi.");
  }

  if (browserClient) return browserClient;

  const { url, key } = getBrowserCredentials();
  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
