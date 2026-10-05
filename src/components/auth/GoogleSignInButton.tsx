"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type GoogleSignInButtonProps = {
  className?: string;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.2 13.7a6 6 0 0 1 0-3.4V7.7H2.9a10 10 0 0 0 0 8.6l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 2.9 7.7l3.3 2.6C7 7.8 9.3 6 12 6Z" />
    </svg>
  );
}

/** Starts the Supabase Google OAuth flow and lets Supabase redirect the browser. */
export function GoogleSignInButton({ className = "" }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });

      if (error) throw error;
      // With the default SDK options, the browser is redirected to Google here.
      // Resetting this state is useful if a browser extension prevents navigation.
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Google orqali kirishni boshlashda xatolik yuz berdi.");
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
        className={`btn btn-ghost w-full !border !border-line !bg-surface-2 !px-5 !py-4 text-ink disabled:cursor-wait disabled:opacity-70 ${className}`}
      >
        <GoogleMark />
        {isLoading ? "Google sahifasi ochilmoqda…" : "Google bilan davom etish"}
      </button>
      {errorMessage ? (
        <p className="mt-3 text-left text-sm font-semibold text-red-600 dark:text-red-300" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
