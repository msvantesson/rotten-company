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
            .select(
              "id, title, summary, file_url, created_at, category, user_id, entity_type, entity_id",
            )
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
  }, [evidence?.entity_type, evidence?.entity_id]);

  async function handleModerationAction(action: ModerationAction["action"]) {
    if (!isModerator || !currentUserId || !evidence) return;
    if (actionBusy) return;

    setActionBusy(true);
    try {
      const res = await fetch("/api/moderation/evidence-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence_id: evidence.id,
          action,
        }),
      });

      if (!res.ok) {
        console.error("Moderation action failed", await res.text());
        return;
      }

      // Refresh metadata after moderation
      const metaRes = await fetch(
        `/api/moderation/evidence-meta?id=${evidence.id}`,
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setModeration(meta);
      }
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Loading evidence…
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="p-6 text-sm text-red-600">
        Evidence not found or you do not have access.
      </div>
    );
  }

  const isOwner = currentUserId && evidence.user_id === currentUserId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {evidence.title || "Untitled evidence"}
        </h1>
        <p className="text-xs text-gray-500">
          Uploaded on{" "}
          {new Date(evidence.created_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </header>

      {evidence.summary && (
        <section className="rounded-md border bg-gray-50 p-4 text-sm">
          <h2 className="font-medium mb-1">Summary</h2>
          <p className="text-gray-800 whitespace-pre-wrap">
            {evidence.summary}
          </p>
        </section>
      )}

      {evidence.file_url && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Attached document</h2>
          <a
            href={evidence.file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            View evidence file
          </a>
        </section>
      )}

      <section className="flex flex-wrap gap-3 items-center text-xs text-gray-600">
        {evidence.entity_type && evidence.entity_id && (
          <button
            type="button"
            onClick={() => router.push(startOverHref)}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
          >
            Start a new upload for this entity
          </button>
        )}

        {isOwner && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs">
            You uploaded this evidence
          </span>
        )}

        {isModerator && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
            Moderator view
          </span>
        )}
      </section>

      {isModerator && moderation && (
        <section className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Moderation status</h2>
              <p className="text-xs text-amber-800">
                Status:{" "}
                <span className="font-semibold">
                  {moderation.status.toUpperCase()}
                </span>
              </p>
              {moderation.assigned_moderator_id && (
                <p className="text-xs">
                  Assigned to: {moderation.assigned_moderator_id}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleModerationAction("approve")}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleModerationAction("reject")}
                className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>

          {moderation.history?.length > 0 && showDebug && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">
                Moderation history (debug)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-amber-100 p-2 text-[10px]">
                {JSON.stringify(moderation.history, null, 2)}
              </pre>
            </details>
          )}
        </section>
      )}

      {!isModerator && moderation && moderation.status !== "approved" && (
        <section className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
          This evidence is still under review by moderators.
        </section>
      )}
    </main>
  );
}
