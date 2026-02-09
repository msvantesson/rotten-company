"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Evidence = {
  id: number;
  title: string | null;
  summary: string | null;
  file_url: string | null;
  created_at: string;
  category: number | null;
  user_id: string;
  entity_type?: string | null;
  entity_id?: number | null;
};

type ModerationAction = {
  action: "approve" | "reject" | "assign" | "skip";
  moderator_id: string;
  moderator_note: string | null;
  created_at: string;
};

type ModerationMeta = {
  status: "pending" | "approved" | "rejected";
  assigned_moderator_id: string | null;
  history: ModerationAction[];
};

export default function EvidenceClientWrapper({
  evidenceId,
  isModerator,
  currentUserId,
}: {
  evidenceId: number;
  isModerator: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDebug = searchParams.get("debug") === "1";

  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [moderation, setModeration] = useState<ModerationMeta | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
      setEvidence(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEvidence() {
      try {
        if (isModerator) {
          const res = await fetch(`/api/evidence/by-id?id=${evidenceId}`);
          if (!res.ok) throw new Error("evidence_by_id_failed");
          const data = await res.json();
          if (!cancelled) setEvidence(data);
        } else {
          const supabase = supabaseBrowser();
          const { data, error } = await supabase
            .from("evidence")
            .select("id, title, summary, file_url, created_at, category, user_id, entity_type, entity_id")
            .eq("id", evidenceId)
            .maybeSingle();

          if (!cancelled) setEvidence(error ? null : (data as Evidence | null));
        }
      } catch {
        if (!cancelled) setEvidence(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvidence();
    return () => {
      cancelled = true;
    };
  }, [evidenceId, isModerator]);

  useEffect(() => {
    if (!isModerator || !Number.isInteger(evidenceId) || evidenceId <= 0) return;

    let cancelled = false;

    fetch(`/api/moderation/evidence-meta?id=${evidenceId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setModeration(data);
      });

    return () => {
      cancelled = true;
    };
  }, [isModerator, evidenceId]);

  const startOverHref = useMemo(() => {
    const base = "/evidence-upload";
    if (evidence?.entity_type && evidence?.entity_id) {
      const qs = new URLSearchParams({
        entityType: String(evidence.entity_type),
        entityId: String(evidence.entity_id),
      });
      return `${base}?${qs.toString()}`;
    }
    return base;
  }, [evidence]);

  async function act(action: "approve" | "reject" | "skip") {
    if (actionBusy) return;
    setActionBusy(true);

    const form = new FormData();
    form.set("evidenceId", String(evidenceId));

    if (action === "reject") {
      const note = prompt("Explain your decision in plain language:");
      if (!note) {
        setActionBusy(false);
        return;
      }
      form.set("note", note);
    }

    const endpoint =
      action === "approve"
        ? "/moderation/actions/approve"
        : action === "reject"
        ? "/moderation/actions/reject"
        : "/moderation/actions/skip";

    await fetch(endpoint, { method: "POST", body: form });
    router.push("/moderation");
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Evidence</h1>
        <p className="mt-2 text-gray-600">Loading evidence…</p>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Evidence</h1>
        <div className="rounded border border-red-300 bg-red-50 p-4">
          <strong>This submission is no longer available.</strong>
          {!isModerator && (
            <a
              href={startOverHref}
              className="mt-4 inline-block rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Start over
            </a>
          )}
        </div>

        {showDebug && (
          <pre className="mt-6 rounded bg-gray-100 p-3 text-xs">
            {JSON.stringify({ evidenceId, isModerator, currentUserId }, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {isModerator && moderation && (
        <div className="rounded border bg-yellow-50 p-4 space-y-2">
          <strong>Moderator panel</strong>
          <div>Status: {moderation.status}</div>
          <div>Assigned moderator: {moderation.assigned_moderator_id ?? "—"}</div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => act("approve")} className="rounded bg-green-600 px-3 py-1 text-white">
              Approve
            </button>
            <button onClick={() => act("reject")} className="rounded bg-red-600 px-3 py-1 text-white">
              Reject
            </button>
            <button onClick={() => act("skip")} className="rounded bg-gray-600 px-3 py-1 text-white">
              Skip
            </button>
          </div>

          {moderation.history?.length > 0 && (
            <div className="pt-3 text-sm">
              <strong>History</strong>
              <ul className="mt-1 space-y-1">
                {moderation.history.map((h, i) => (
                  <li key={i}>
                    {h.action} · {new Date(h.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h1 className="text-2xl font-semibold">Evidence #{evidence.id}</h1>

      <div>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </div>

      <div>
        <strong>Created:</strong> {new Date(evidence.created_at).toLocaleString()}
      </div>

      {evidence.summary && (
        <div>
          <strong>Summary:</strong>
          <p className="mt-1 text-gray-700">{evidence.summary}</p>
        </div>
      )}

      {evidence.file_url && (
        <a href={evidence.file_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
          View uploaded file
        </a>
      )}

      {!isModerator && (
        <a href={startOverHref} className="inline-block rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white">
          Submit new evidence
        </a>
      )}

      {showDebug && (
        <pre className="mt-6 rounded bg-gray-100 p-3 text-xs">
          {JSON.stringify({ evidenceId, evidence, moderation }, null, 2)}
        </pre>
      )}
    </div>
  );
}
