"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FieldValues = {
  name: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  country: string | null;
  size_employees: number | null;
};

type Props = {
  requestId: string;
  companySlug: string;
  companyName: string;
  why: string;
  submittedAt: string;
  current: FieldValues;
  proposed: FieldValues;
};

function DiffRow({
  label,
  current,
  proposed,
}: {
  label: string;
  current: string | number | null;
  proposed: string | number | null;
}) {
  const hasChange =
    proposed !== null &&
    proposed !== "" &&
    String(proposed).trim() !== "" &&
    String(proposed) !== String(current ?? "");

  return (
    <tr className={hasChange ? "bg-amber-50" : ""}>
      <td className="px-3 py-2 text-xs font-medium text-neutral-500 w-32">{label}</td>
      <td className="px-3 py-2 text-sm text-neutral-800">
        {current != null && current !== "" ? String(current) : <span className="text-neutral-400 italic">—</span>}
      </td>
      <td className="px-3 py-2 text-sm">
        {proposed != null && String(proposed).trim() !== "" ? (
          <span className={hasChange ? "font-medium text-amber-700" : "text-neutral-800"}>
            {String(proposed)}
          </span>
        ) : (
          <span className="text-neutral-400 italic">no change</span>
        )}
      </td>
    </tr>
  );
}

export default function CompanyEditReviewClient({
  requestId,
  companySlug,
  companyName,
  why,
  submittedAt,
  current,
  proposed,
}: Props) {
  const router = useRouter();
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setLoading("approve");
    try {
      const res = await fetch("/api/moderation/company-edits/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, moderator_note: approveNote || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/moderation/company-edits");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error while approving");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectNote.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setError(null);
    setLoading("reject");
    try {
      const res = await fetch("/api/moderation/company-edits/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, moderator_note: rejectNote }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/moderation/company-edits");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error while rejecting");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Link href="/moderation/company-edits" className="text-sm text-blue-700">
        ← Back to edit suggestions
      </Link>

      <header>
        <h1 className="text-2xl font-bold">Review Edit Suggestion</h1>
        <p className="text-sm text-neutral-500 mt-1">
          <Link href={`/company/${companySlug}`} className="text-blue-700 hover:underline">
            {companyName}
          </Link>{" "}
          · Submitted {new Date(submittedAt).toLocaleString()}
        </p>
      </header>

      {/* Reason */}
      <section className="rounded-md border border-border bg-surface p-4 space-y-1">
        <p className="text-xs font-semibold text-neutral-500">Why</p>
        <p className="text-sm text-neutral-800 whitespace-pre-wrap">{why || "—"}</p>
      </section>

      {/* Current vs Proposed diff */}
      <section className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 w-32">Field</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Current</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Proposed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            <DiffRow label="Name" current={current.name} proposed={proposed.name} />
            <DiffRow label="Website" current={current.website} proposed={proposed.website} />
            <DiffRow label="Industry" current={current.industry} proposed={proposed.industry} />
            <DiffRow label="Description" current={current.description} proposed={proposed.description} />
            <DiffRow label="Country" current={current.country} proposed={proposed.country} />
            <DiffRow label="Employees" current={current.size_employees} proposed={proposed.size_employees} />
          </tbody>
        </table>
      </section>

      {error && (
        <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Approve */}
        <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Approve</h2>
          <p className="text-sm text-neutral-600">
            Apply the non-empty proposed values to the company profile.
          </p>
          <label className="text-sm">
            Note (optional)
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Optional moderator note"
              className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[60px]"
            />
          </label>
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="mt-auto rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading === "approve" ? "Approving…" : "Approve"}
          </button>
        </div>

        {/* Reject */}
        <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-3">
          <h2 className="text-base font-semibold">Reject</h2>
          <p className="text-sm text-neutral-600">
            Decline this suggestion. A reason is required.
          </p>
          <label className="text-sm">
            Rejection reason <span className="text-red-500">*</span>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Explain why this suggestion is rejected"
              required
              className="mt-1 w-full rounded border px-2 py-1 text-sm min-h-[70px]"
            />
          </label>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="mt-auto rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </section>
    </main>
  );
}
