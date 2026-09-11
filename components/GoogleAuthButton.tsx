"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

function buildRedirectTo() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;

  if (typeof window !== "undefined") {
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/");
    return redirectTo.toString();
  }

  if (!configuredOrigin) {
    return null;
  }

  const redirectTo = new URL("/auth/callback", configuredOrigin);
  redirectTo.searchParams.set("next", "/");
  return redirectTo.toString();
}

export default function GoogleAuthButton() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (isPending) {
      return;
    }

    const redirectTo = buildRedirectTo();
    if (!redirectTo) {
      setErrorMessage("Google sign-in is temporarily unavailable. Please try again later.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (!error) {
        return;
      }

      setErrorMessage("Google sign-in could not be started. Please try again.");
    } catch {
      setErrorMessage("Google sign-in could not be started. Please try again.");
    }

    setIsPending(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full border border-border bg-surface text-foreground p-3 rounded font-medium hover:bg-muted transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-800">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
