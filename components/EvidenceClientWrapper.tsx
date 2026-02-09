"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  note: string | null;
  created_at: string;
};

type ModerationMeta = {
  status: "pending" | "approved" | "rejected";
  assigned_moderator_id: string | null;
  history: ModerationAction[];
};

export default function EvidenceClientWrapper({
  isModerator,
  currentUserId,
}: {
  isModerator: boolean;
  currentUserId: string | null;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ✅ Canonical ID resolution (matches server)
  const rawId =
    typeof params?.id === "string"
      ? params.id
      : typeof searchParams.get("nxtPid") === "string"
      ? searchParams.get("nxtPid")
      : null;

  const evidenceId = Number(rawId);
  const showDebug = searchParams.get("debug") === "1";

  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [moderation, setModeration] = useState<ModerationMeta | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // ─────────────────────────────────────────────
  // LOAD EVIDENCE (USER‑SCOPED)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEvidence() {
      try {
        const supabase = supabaseBrowser();
        const { data: session } = await supabase.auth.getSession();

        if (!session.session) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("evidence")
          .select(
            "id, title, summary, file_url, created_at, category, user_id, entity_type, entity_id"
          )
          .eq("id", evidenceId)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setEvidence(null);
          setLoading(false);
          return;
        }

        setEvidence(data as Evidence);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setEvidence(null);
          setLoading(false);
        }
      }
    }

    loadEvidence();
    return () => {
      cancelled = true;
    };
  }, [evidenceId]);

  // ─────────────────────────────────────────────
  // LOAD MODERATION META (SERVICE‑ROLE)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isModerator || !Number.isInteger(evidenceId)) return;

    let cancelled = false;

    async function loadModeration() {
      const res = await fetch(
        `/api/moderation/evidence-meta?id=${evidenceId}`
      );
      if (!res.ok) return;

      const data = await res.json();
      if (!cancelled) setModeration(data);
    }

    loadModeration();
    return () => {
      cancelled = true;
    };
  }, [isModerator, evidenceId]);

  const isOwner =
    evidence && currentUserId
      ? evidence.user_id === currentUserId
      : false;

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

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
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
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {isModerator && moderation && (
        <div className="rounded border bg-yellow-50 p-4 space-y-2">
          <strong>Moderator panel</strong>
          <div>Status: {moderation.status}</div>
          <div>
            Assigned moderator:{" "}
            {moderation.assigned_moderator_id ?? "—"}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold">Evidence #{evidence.id}</h1>

      <div>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </div>

      <div>
        <strong>Created:</strong>{" "}
        {new Date(evidence.created_at).toLocaleString()}
      </div>

      {evidence.summary && (
        <div>
          <strong>Summary:</strong>
          <p className="mt-1 text-gray-700">{evidence.summary}</p>
        </div>
      )}

      {evidence.file_url && (
        <a
          href={evidence.file_url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          View uploaded file
        </a>
      )}

      {!isModerator && (
        <a
          href={startOverHref}
          className="inline-block rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white"
        >
          Submit new evidence
        </a>
      )}

      {showDebug && (
        <pre className="mt-6 rounded bg-gray-100 p-3 text-xs">
          {JSON.stringify({ evidence, moderation }, null, 2)}
        </pre>
      )}
    </div>
  );
}
