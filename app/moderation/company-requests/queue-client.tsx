"use client";

import { useMemo, useState } from "react";

type CompanyRequestRow = {
  id: string;
  name: string;
  why: string | null;
  status: string;
  created_at: string;
  country: string | null;
  website: string | null;
  description: string | null;
  user_id: string | null;
};

type DebugInfo = {
  ssrUserPresent: boolean;
  ssrUserId: string | null;
  isModerator: boolean;
};

export default function CompanyRequestsQueue({
  initialRequests,
  debug,
}: {
  initialRequests: CompanyRequestRow[];
  debug: DebugInfo;
}) {
  const [requests, setRequests] = useState<CompanyRequestRow[]>(initialRequests);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject" | "skip">(null);
  const [error, setError] = useState<string | null>(null);

  const current = requests[index] ?? null;

  const positionLabel = useMemo(() => {
    if (!requests.length) return "Item 0 of 0";
    return `Item ${Math.min(index + 1, requests.length)} of ${requests.length}`;
  }, [requests.length, index]);

  function next() {
    setNote("");
    setError(null);
    setBusy(null);
    setIndex((i) => Math.min(i + 1, Math.max(requests.length - 1, 0)));
  }

  async function act(action: "approve" | "reject" | "skip") {
    if (!debug.isModerator) {
      setError("Not a moderator (UI gated).");
      return;
    }

    if (!current) return;

    if (action === "reject" && !note.trim()) {
      setError("Moderator note is required for rejection.");
      return;
    }

    setBusy(action);
    setError(null);

    try {
      if (action === "skip") {
        next();
        return;
      }

      const res = await fetch(`/api/moderation/company-requests/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          moderator_note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || `Failed to ${action}`);
        setBusy(null);
        return;
      }

      setRequests((prev) => prev.filter((r) => r.id !== current.id));
      setNote("");
      setBusy(null);
      setIndex((i) => Math.max(0, Math.min(i, requests.length - 2)));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Company requests moderation</h1>
        <p className="text-sm text-neutral-600">
          Review contributor requests for new companies.
        </p>
      </header>

      <section className="rounded-md border bg-white p-4 space-y-2">
        <p className="text-sm font-medium">Debug</p>
        <p className="text-xs text-neutral-600">
          SSR user present: {String(debug.ssrUserPresent)}
        </p>
        <p className="text-xs text-neutral-600">SSR user id: {debug.ssrUserId ?? "null"}</p>
        <p className="text-xs text-neutral-600">isModerator: {String(debug.isModerator)}</p>
      </section>

      {!debug.isModerator && (
        <section className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900">
          You are logged in, but not recognized as a moderator (by UI check). Add your user id
          to the <code>moderators</code> table.
        </section>
      )}

      {requests.length === 0 && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending company requests.
        </section>
      )}

      {requests.length > 0 && (
        <section className="rounded-md border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">{positionLabel}</p>
            <p className="text-xs uppercase tracking-wide text-neutral-500">PENDING</p>
          </div>

          {current ? (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{current.name}</h2>
                <p className="text-xs text-neutral-500">
                  Submitted at {new Date(current.created_at).toLocaleString()}
                </p>
              </div>

              {current.why && (
                <p className="text-sm text-neutral-800 whitespace-pre-wrap">{current.why}</p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Moderator note (required for rejection)
                </label>
                <p className="text-xs text-neutral-600">
                  Explain your decision in plain language. This may be shared with the contributor.
                </p>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write a short note..."
                  disabled={!!busy || !debug.isModerator}
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => act("approve")}
                  disabled={!debug.isModerator || !!busy}
                >
                  Approve
                </button>

                <button
                  className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => act("reject")}
                  disabled={!debug.isModerator || !!busy}
                >
                  Reject
                </button>

                <button
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => act("skip")}
                  disabled={!debug.isModerator || !!busy}
                >
                  Skip
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600">No current item.</p>
          )}
        </section>
      )}
    </main>
  );
}
