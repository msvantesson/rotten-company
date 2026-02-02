"use client";

import { useState } from "react";

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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateNote(id: string, value: string) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  async function act(action: "approve" | "reject" | "skip", id: string) {
    if (!debug.isModerator) {
      setErrors((prev) => ({ ...prev, [id]: "Not a moderator (UI gated)." }));
      return;
    }

    const note = notes[id]?.trim() ?? "";

    if (action === "reject" && !note) {
      setErrors((prev) => ({
        ...prev,
        [id]: "Moderator note is required for rejection.",
      }));
      return;
    }

    setBusyId(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));

    try {
      if (action === "skip") {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setBusyId(null);
        return;
      }

      const res = await fetch(`/api/moderation/company-requests/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          moderator_note: note || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setErrors((prev) => ({
          ...prev,
          [id]: text || `Failed to ${action}`,
        }));
        setBusyId(null);
        return;
      }

      setRequests((prev) => prev.filter((r) => r.id !== id));
      setBusyId(null);
    } catch (e: any) {
      setErrors((prev) => ({
        ...prev,
        [id]: e?.message ?? "Unknown error",
      }));
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
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
        <p className="text-xs text-neutral-600">
          SSR user id: {debug.ssrUserId ?? "null"}
        </p>
        <p className="text-xs text-neutral-600">
          isModerator: {String(debug.isModerator)}
        </p>
      </section>

      {!debug.isModerator && (
        <section className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900">
          You are logged in, but not recognized as a moderator. Add your user id
          to the <code>moderators</code> table.
        </section>
      )}

      {requests.length === 0 && (
        <section className="rounded-md border p-4 text-sm text-neutral-600">
          No pending company requests.
        </section>
      )}

      {requests.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((r) => (
            <div
              key={r.id}
              className="rounded-md border bg-white p-4 space-y-3"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{r.name}</h2>
                <p className="text-xs text-neutral-500">
                  Submitted {new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              {r.why && (
                <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                  {r.why}
                </p>
              )}

              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                placeholder="Moderator note (required for rejection)"
                value={notes[r.id] ?? ""}
                onChange={(e) => updateNote(r.id, e.target.value)}
                disabled={busyId === r.id || !debug.isModerator}
              />

              {errors[r.id] && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {errors[r.id]}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => act("approve", r.id)}
                  disabled={busyId === r.id || !debug.isModerator}
                >
                  Approve
                </button>

                <button
                  className="rounded-md bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={() => act("reject", r.id)}
                  disabled={busyId === r.id || !debug.isModerator}
                >
                  Reject
                </button>

                <button
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => act("skip", r.id)}
                  disabled={busyId === r.id || !debug.isModerator}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
