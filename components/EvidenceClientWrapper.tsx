"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Evidence {
  id: number;
  title: string | null;
  summary: string | null;
  status: string;
  file_url: string | null;
  created_at: string;
}

export default function EvidenceClientWrapper() {
  const pathname = usePathname();
  const id = Number(pathname.split("/").pop());

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id)) {
      setError("Invalid evidence id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadEvidence() {
      try {
        const res = await fetch(`/api/evidence/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to load evidence (${res.status})`);
        }

        const data = await res.json();

        if (!cancelled) {
          setEvidence(data.evidence ?? data);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Failed to load evidence");
          setLoading(false);
        }
      }
    }

    loadEvidence();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p>Loading your evidence details…</p>;
  }

  if (error) {
    return (
      <div style={{ background: "#fff1f0", padding: 12, border: "1px solid #f2a0a0" }}>
        <strong>Error</strong>
        <div>{error}</div>
      </div>
    );
  }

  if (!evidence) {
    return <p>No evidence found.</p>;
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Evidence #{evidence.id}</h2>

      <p>
        <strong>Status:</strong> {evidence.status}
      </p>

      <p>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
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

      <p style={{ fontSize: 12, color: "#666" }}>
        Created {new Date(evidence.created_at).toLocaleString()}
      </p>
    </section>
  );
}
