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
        .select("*")
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
      <div style={{ padding: 24 }}>
        <h1>My Evidence</h1>
        <p>Loading your evidence details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>My Evidence</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!evidence) return null;

  return (
    <div style={{ padding: 24 }}>
      <h1>My Evidence #{evidence.id}</h1>

      <p>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </p>

      <p>
        <strong>Status:</strong> {evidence.status}
      </p>

      <p>
        <strong>Created:</strong>{" "}
        {new Date(evidence.created_at).toLocaleString()}
      </p>

      {evidence.summary && (
        <p>
          <strong>Summary:</strong> {evidence.summary}
        </p>
      )}

      {evidence.file_url && (
        <p>
          <a href={evidence.file_url} target="_blank" rel="noreferrer">
            View uploaded file
          </a>
        </p>
      )}

      <pre
        style={{
          marginTop: 16,
          background: "#f6f6f6",
          padding: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </div>
  );
}
