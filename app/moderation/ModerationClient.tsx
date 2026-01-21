"use client";

import { useEffect, useMemo, useState } from "react";

type Evidence = {
  id: number;
  title: string;
  summary: string | null;
  contributor_note: string | null;
  created_at: string;
  assigned_moderator_id?: string | null;
};

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

type Props = {
  evidence: Evidence[];
  approveEvidence: (formData: FormData) => Promise<ActionResult>;
  rejectEvidence: (formData: FormData) => Promise<ActionResult>;
  moderatorId: string;
};

export default function ModerationClient({
  evidence,
  approveEvidence,
  rejectEvidence,
  moderatorId,
}: Props) {
  const myQueue = useMemo(
    () =>
      evidence.filter(
        (e) =>
          !e.assigned_moderator_id ||
          e.assigned_moderator_id === moderatorId
      ),
    [evidence, moderatorId]
  );

  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = myQueue[index] ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || submitting) return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleApprove();
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReject();
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSkip();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, submitting, note]);

  if (!myQueue.length) {
    return (
      <p className="text-sm text-gray-500">
        No pending evidence assigned to you.
      </p>
    );
  }

  async function handleApprove() {
    if (!current) return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("evidence_id", String(current.id));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note);

    const result = await approveEvidence(fd);
    if (!result.ok) {
      setError(result.error || "Something went wrong while approving.");
      setSubmitting(false);
      return;
    }

    advance();
  }

  async function handleReject() {
    if (!current || !note.trim()) return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("evidence_id", String(current.id));
    fd.set("moderator_id", moderatorId);
    fd.set("moderator_note", note);

    const result = await rejectEvidence(fd);
    if (!result.ok) {
      setError(result.error || "Something went wrong while rejecting.");
      setSubmitting(false);
      return;
    }

    advance();
  }

  function handleSkip() {
    // Phase 1: local skip only (no DB change yet)
    advance();
  }

  function advance() {
    setNote("");
    setSubmitting(false);
    setError(null);
    setIndex((i) => {
      const next = i + 1;
      if (next >= myQueue.length) return myQueue.length - 1;
      return next;
    });
  }

  return (
    <div className="border rounded p-6 space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Item {index + 1} of {myQueue.length}
        </span>
        <span>Keyboard: A=Approve · R=Reject · S=Skip</span>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="text-xs text-gray-400 mt-1">
          Submitted at {new Date(current.created_at).toLocaleString()}
        </p>
      </div>

      {current.summary && (
        <p className="text-sm text-gray-800 whitespace-pre-line">
          {current.summary}
        </p>
      )}

      {current.contributor_note && (
        <div className="text-xs text-gray-600 border-l-2 border-gray-300 pl-3">
          <div className="font-medium mb-1">Contributor note</div>
          <p className="whitespace-pre-line">{current.contributor_note}</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Moderator note{" "}
          <span className="text-gray-400">(required for rejection)</span>
        </label>
        <textarea
          className="w-full border rounded p-2 text-sm"
          placeholder="Explain your decision in plain language. This may be shared with the contributor."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          rows={4}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="px-3 py-1 rounded bg-green-600 text-white text-sm disabled:opacity-60"
        >
          Approve (A)
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={submitting || !note.trim()}
          className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-60"
        >
          Reject (R)
        </button>

        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="px-3 py-1 rounded bg-gray-200 text-sm disabled:opacity-60"
        >
          Skip (S)
        </button>
      </div>
    </div>
  );
}
