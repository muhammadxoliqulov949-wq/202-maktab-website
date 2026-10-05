"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient, hasSupabaseBrowserCredentials } from "@/lib/supabase/browser";

/**
 * Initializes Supabase on every page load.
 *
 * Google returns to window.location.origin. Initializing the browser client on
 * that page lets supabase-js detect the OAuth callback URL, exchange/store the
 * session, and keep it available after the redirect.
 */
export function SupabaseSessionBootstrap() {
  useEffect(() => {
    if (!hasSupabaseBrowserCredentials()) return;

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().catch(() => {
      // Login UI reports user-facing OAuth errors. Never break the public site
      // because an optional saved session can no longer be refreshed.
    });
  }, []);

  return null;
}
