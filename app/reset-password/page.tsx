export const dynamic = "force-dynamic";

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Reset password</h1>
        <p className="text-red-600 text-sm">Missing or invalid token.</p>
      </main>
    );
  }

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

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: password }),
    });

    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Password reset failed.");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-xl font-semibold">Reset your password</h1>

      {success ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
          Your password has been reset. Redirecting…
        </div>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
