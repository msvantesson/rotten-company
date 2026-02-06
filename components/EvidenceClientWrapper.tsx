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

export default function EvidenceClientWrapper({
  isModerator,
  currentUserId,
}: {
  isModerator: boolean;
  currentUserId: string | null;
}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const evidenceId = Number(params?.id);
  const showDebug = searchParams.get("debug") === "1";

  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  useEffect(() => {
    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvidence = async () => {
      try {
        const supabase = supabaseBrowser();

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
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
          if (isModerator) {
            setEvidence({
              id: evidenceId,
              title: "(Unavailable to contributor)",
              summary: null,
              file_url: null,
              created_at: new Date().toISOString(),
              category: null,
              user_id: "",
              entity_type: null,
              entity_id: null,
            });
          } else {
            setEvidence(null);
          }
          setLoading(false);
          return;
        }

        setEvidence(data as Evidence);
        setLoading(false);
      } catch {
        if (cancelled) return;
        if (isModerator) {
          setEvidence({
            id: evidenceId,
            title: "(Unavailable to contributor)",
            summary: null,
            file_url: null,
            created_at: new Date().toISOString(),
            category: null,
            user_id: "",
            entity_type: null,
            entity_id: null,
          });
        } else {
          setEvidence(null);
        }
        setLoading(false);
      }
    };

    loadEvidence();

    return () => {
      cancelled = true;
    };
  }, [evidenceId, isModerator]);

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

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">My Evidence</h1>
        <p className="mt-2 text-gray-600">Loading evidence…</p>
      </div>
    );
  }

  if (!evidence) {
    if (isModerator) {
      return (
        <div className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">Evidence</h1>
          <div className="rounded border border-gray-300 bg-gray-50 p-4">
            <strong>Evidence not available</strong>
            <p className="mt-2 text-sm text-gray-700">
              This evidence is no longer visible to contributors.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">My Evidence</h1>

        <div className="rounded border border-red-300 bg-red-50 p-4">
          <strong>This submission was rejected</strong>

          <p className="mt-2 text-sm text-red-700">
            This evidence didn’t meet the moderation criteria.
          </p>

          <a
            href={startOverHref}
            className="mt-4 inline-block rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Start over
          </a>
        </div>
      </div>
    );
  }

  if (isModerator && !isOwner) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">
          Evidence #{evidence.id}{" "}
          <span className="text-sm text-gray-500">(Moderator view)</span>
        </h1>

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

        {showDebug && (
          <pre className="mt-6 rounded bg-gray-100 p-3 text-xs">
            {JSON.stringify(evidence, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
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
          className="inline-block rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Submit new evidence
        </a>
      )}

      {showDebug && (
        <pre className="mt-6 rounded bg-gray-100 p-3 text-xs">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      )}
    </div>
  );
}
