"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  isModerator,
  currentUserId,
}: {
  isModerator: boolean;
  currentUserId: string | null;
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  // ─────────────────────────────────────────────
  // CANONICAL ID RESOLUTION (CLIENT)
  // ─────────────────────────────────────────────
  const rawId =
    typeof searchParams.get("nxtPid") === "string"
      ? searchParams.get("nxtPid")
      : typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const evidenceId = Number(rawId);

  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [moderation, setModeration] = useState<ModerationMeta | null>(null);

  // ─────────────────────────────────────────────
  // LOAD EVIDENCE
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!Number.isInteger(evidenceId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEvidence() {
      try {
        if (isModerator) {
          const res = await fetch(`/api/evidence/by-id?id=${evidenceId}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (!cancelled) setEvidence(data);
        } else {
          const supabase = supabaseBrowser();
          const { data } = await supabase
            .from("evidence")
            .select(
              "id, title, summary, file_url, created_at, category, user_id, entity_type, entity_id"
            )
            .eq("id", evidenceId)
            .maybeSingle();

          if (!cancelled) setEvidence(data ?? null);
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

  // ─────────────────────────────────────────────
  // LOAD MODERATION META
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isModerator || !Number.isInteger(evidenceId)) return;

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
    if (evidence?.entity_type && evidence?.entity_id) {
      const qs = new URLSearchParams({
        entityType: String(evidence.entity_type),
        entityId: String(evidence.entity_id),
      });
      return `/evidence-upload?${qs.toString()}`;
    }
    return "/evidence-upload";
  }, [evidence]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (loading) {
    return <p>Loading evidence…</p>;
  }

  if (!evidence) {
    return (
      <div>
        <strong>This submission is no longer available.</strong>
        {!isModerator && (
          <a href={startOverHref} className="block mt-4 underline">
            Start over
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isModerator && moderation && (
        <div className="border p-4 bg-yellow-50">
          <strong>Moderator panel</strong>
          <div>Status: {moderation.status}</div>
          <div>
            Assigned moderator:{" "}
            {moderation.assigned_moderator_id ?? "—"}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold">
        Evidence #{evidence.id}
      </h1>

      <div>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </div>

      <div>
        <strong>Created:</strong>{" "}
        {new Date(evidence.created_at).toLocaleString()}
      </div>

      {evidence.summary && <p>{evidence.summary}</p>}

      {evidence.file_url && (
        <a href={evidence.file_url} target="_blank" rel="noreferrer">
          View uploaded file
        </a>
      )}
    </div>
  );
}
