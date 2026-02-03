"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    setStatus("loading");

    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail }),
    });

    setStatus("idle");

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Request failed.");
      return;
    }

    setStatus("done");
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-xl font-semibold">Forgot password</h1>

      {status === "done" ? (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
          If an account exists for that email, you’ll receive a reset link shortly.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={status === "loading"}
            className="w-full rounded-md bg-emerald-600 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            {status === "loading" ? "Sending…" : "Send reset link"}
          </button>
        </div>
      )}
    </main>
  );
}
