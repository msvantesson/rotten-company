// components/EvidenceClientWrapper.tsx
"use client";

import { useEffect, useState } from "react";
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
};

export default function EvidenceClientWrapper() {
  const params = useParams();
  const evidenceId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  useEffect(() => {
    if (!Number.isInteger(evidenceId)) {
      setError("Invalid evidence id");
      setLoading(false);
      return;
    }

    const loadEvidence = async () => {
      const supabase = supabaseBrowser();

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("evidence")
        .select(
          "id, title, summary, status, file_url, created_at, category"
        )
        .eq("id", evidenceId)
        .maybeSingle();

      if (error || !data) {
        setError("Failed to load evidence (404)");
        setLoading(false);
        return;
      }

      setEvidence(data);
      setLoading(false);
    };

    loadEvidence();
  }, [evidenceId]);

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
      <h1 className="text-2xl font-semibold">
        Evidence #{evidence.id}
      </h1>

      <div>
        <strong>Title:</strong>{" "}
        {evidence.title ?? "(no title)"}
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
