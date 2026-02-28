"use client";

import { useState, useTransition } from "react";

type Props = {
  companyId: number;
  currentTenureId: number | null;
};

export default function CeoRequestForm({ companyId, currentTenureId }: Props) {
  const [mode, setMode] = useState<"closed" | "add" | "end">("closed");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = { company_id: String(companyId) };
    formData.forEach((v, k) => {
      body[k] = v.toString();
    });

    startTransition(async () => {
      try {
        const res = await fetch("/api/moderation/leader-tenure-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (res.ok) {
          setResult({ ok: true });
          setMode("closed");
        } else {
          setResult({ ok: false, error: json.error ?? "Failed to submit request." });
        }
      } catch {
        setResult({ ok: false, error: "Network error." });
      }
    });
  }

  return (
    <div className="mt-4 border rounded-md p-4 bg-yellow-50 space-y-3">
      <p className="text-xs font-semibold text-yellow-800">Moderator: Propose CEO change</p>

      {result?.ok && (
        <p className="text-sm text-green-700">Request submitted successfully.</p>
      )}
      {result?.error && (
        <p className="text-sm text-red-700">{result.error}</p>
      )}

      {mode === "closed" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("add"); setResult(null); }}
            className="rounded bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900"
          >
            Propose new CEO
          </button>
          {currentTenureId && (
            <button
              type="button"
              onClick={() => { setMode("end"); setResult(null); }}
              className="rounded border border-black px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-100"
            >
              Propose end of current tenure
            </button>
          )}
        </div>
      )}

      {mode === "add" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="request_type" value="add" />
          <input type="hidden" name="role" value="ceo" />
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Leader name <span className="text-red-500">*</span>
            </label>
            <input
              name="leader_name"
              type="text"
              required
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              LinkedIn URL (optional)
            </label>
            <input
              name="linkedin_url"
              type="url"
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Start date <span className="text-red-500">*</span>
            </label>
            <input
              name="started_at"
              type="date"
              required
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              End date (optional – leave blank if current)
            </label>
            <input
              name="ended_at"
              type="date"
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => setMode("closed")}
              className="rounded border px-3 py-1.5 text-xs font-medium text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "end" && currentTenureId && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="request_type" value="end" />
          <input type="hidden" name="role" value="ceo" />
          <input type="hidden" name="target_tenure_id" value={String(currentTenureId)} />
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              End date <span className="text-red-500">*</span>
            </label>
            <input
              name="ended_at"
              type="date"
              required
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => setMode("closed")}
              className="rounded border px-3 py-1.5 text-xs font-medium text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
