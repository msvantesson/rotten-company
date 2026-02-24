"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function ResetPasswordClient() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);

    if (!password || !confirm) {
      setError("Please fill out both fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError("Password reset failed. Please use the reset link again.");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-xl font-semibold">Reset your password</h1>

      {success ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
          Your password has been reset. Redirecting…
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              New password
            </label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm password
            </label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </div>
      )}
    </main>
  );
}
