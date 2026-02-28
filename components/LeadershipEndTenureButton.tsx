"use client";

import { useState, useTransition } from "react";

type Props = {
  tenureId: number;
  leaderName: string;
};

export default function LeadershipEndTenureButton({ tenureId, leaderName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
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
          setIsOpen(false);
        } else {
          setResult({ ok: false, error: json.error ?? "Failed to submit request." });
        }
      } catch {
        setResult({ ok: false, error: "Network error." });
      }
    });
  }

  if (result?.ok) {
    return <span className="text-xs text-green-700">End request submitted</span>;
  }

  return (
    <div className="space-y-1">
      {result?.error && (
        <p className="text-xs text-red-700">{result.error}</p>
      )}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={`Propose end of ${leaderName}'s tenure`}
          className="rounded border border-black px-2 py-1 text-xs font-medium text-black hover:bg-neutral-100"
        >
          Propose end
        </button>
      )}
      {isOpen && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1">
          <input type="hidden" name="request_type" value="end" />
          <input type="hidden" name="role" value="ceo" />
          <input type="hidden" name="target_tenure_id" value={String(tenureId)} />
          <input
            name="ended_at"
            type="date"
            required
            className="rounded border px-2 py-1 text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? "…" : "Submit"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded border px-2 py-1 text-xs text-neutral-600"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
