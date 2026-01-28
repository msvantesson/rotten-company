"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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

export default function EvidenceClientWrapper() {
  const params = useParams();
  const evidenceId = Number(params?.id);

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
          // Evidence does not exist → rejected or never existed
          setEvidence(null);
          setLoading(false);
          return;
        }

        setEvidence(data as Evidence);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setEvidence(null);
        setLoading(false);
      }
    };

    loadEvidence();

    return () => {
      cancelled = true;
    };
  }, [evidenceId]);

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
        <p className="mt-2 text-gray-600">Loading your evidence…</p>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">My Evidence</h1>

        <div className="rounded border border-red-300 bg-red-50 p-4">
          <h2 className="font-semibold text-red-700">
            This submission was rejected
          </h2>

          <p className="mt-2 text-sm text-red-700">
            This evidence didn’t meet the moderation criteria and is no longer
            available. You can submit a new piece of evidence if you want to try
            again.
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
