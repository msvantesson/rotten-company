// components/EvidenceClientWrapper.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Evidence = {
  id: number;
  title: string | null;
  summary: string | null;
  status: string;
  file_url: string | null;
  created_at: string;
  category: number | null;
  user_id: string;

  // optional but useful if your table has them; safe to keep even if null
  entity_type?: string | null;
  entity_id?: number | null;
};

export default function EvidenceClientWrapper() {
  const params = useParams();
  const evidenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
      setError("Invalid evidence id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadEvidence = async () => {
      try {
        const supabase = supabaseBrowser();

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError) {
          setError("Failed to read session");
          setLoading(false);
          return;
        }

        const session = sessionData.session;
        if (!session) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        setViewerUserId(session.user.id);

        const { data, error } = await supabase
          .from("evidence")
          .select(
            "id, title, summary, status, file_url, created_at, category, user_id, entity_type, entity_id"
          )
          .eq("id", evidenceId)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setError("Failed to load evidence (404)");
          setLoading(false);
          return;
        }

        setEvidence(data as Evidence);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Failed to load evidence");
        setLoading(false);
      }
    };

    loadEvidence();

    return () => {
      cancelled = true;
    };
  }, [evidenceId]);

  const isOwner = useMemo(() => {
    if (!evidence?.user_id || !viewerUserId) return false;
    return evidence.user_id === viewerUserId;
  }, [evidence?.user_id, viewerUserId]);

  const startOverHref = useMemo(() => {
    // Phase 1: Reject → start over (new submission)
    // Prefill is optional. If entity info exists, we include it; if not, we just go to the page.
    const base = "/evidence-upload";

    const entityType = evidence?.entity_type ?? null;
    const entityId = evidence?.entity_id ?? null;

    if (entityType && entityId && Number.isInteger(Number(entityId))) {
      const qs = new URLSearchParams({
        entityType: String(entityType),
        entityId: String(entityId),
      });
      return `${base}?${qs.toString()}`;
    }

    return base;
  }, [evidence?.entity_type, evidence?.entity_id]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">My Evidence</h1>
        <p className="mt-2 text-gray-600">Loading your evidence details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">My Evidence</h1>
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  if (!evidence) return null;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Evidence #{evidence.id}</h1>

      <div>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </div>

      <div>
        <strong>Status:</strong>{" "}
        <span className="capitalize">{evidence.status}</span>
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
        <div>
          <a
            href={evidence.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            View uploaded file
          </a>
        </div>
      )}

      {evidence.status === "rejected" && isOwner && (
        <div className="mt-8 border-t pt-6">
          <div className="rounded border border-red-300 bg-red-50 p-4">
            <h2 className="font-semibold text-red-700">
              This evidence was rejected
            </h2>

            <p className="mt-2 text-sm text-red-700">
              This submission didn’t meet the moderation criteria and won’t be
              published. You can submit a new piece of evidence if you want to
              try again.
            </p>

            <a
              href={startOverHref}
              className="mt-4 inline-block rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Start over
            </a>
          </div>
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-500">
          Debug payload
        </summary>
        <pre className="mt-2 rounded bg-gray-100 p-3 text-xs overflow-x-auto">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    </div>
  );
}
