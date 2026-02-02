"use client";

import { useState } from "react";

type Request = {
  id: string;
  name: string;
  why: string | null;
  status: string;
  created_at: string;
};

export default function CompanyRequestsClient({
  requests,
  isModerator,
}: {
  requests: Request[];
  isModerator: boolean;
}) {
  const [items, setItems] = useState(requests);

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/moderation/company-request/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Company requests</h1>
        <p className="text-sm text-neutral-600">
          Review contributor requests for new companies.
        </p>
      </header>

      {items.length === 0 && (
        <p className="text-sm text-neutral-600">No requests yet.</p>
      )}

      <ul className="space-y-3">
        {items.map((r) => (
          <li
            key={r.id}
            className="rounded-md border px-3 py-2 text-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.name}</p>
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                {r.status}
              </span>
            </div>

            {r.why && (
              <p className="text-xs text-neutral-600 line-clamp-2">
                {r.why}
              </p>
            )}

            <p className="text-[11px] text-neutral-400">
              {new Date(r.created_at).toLocaleString()}
            </p>

            {isModerator && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => act(r.id, "approve")}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
                >
                  Approve
                </button>

                <button
                  onClick={() => act(r.id, "reject")}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                >
                  Reject
                </button>

                <a
                  href={`/company/request?name=${encodeURIComponent(r.name)}`}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-neutral-100"
                >
                  Start over
                </a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
