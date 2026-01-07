"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface EvidenceUploadProps {
  entityId: number;
  entityType: "company" | "leader" | "manager" | "owner";
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .toLowerCase();
}

export default function EvidenceUpload({
  entityId,
  entityType,
}: EvidenceUploadProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState("misconduct");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    if (!title || !file) {
      setError("Title and file are required.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoading(false);
      setError("User not authenticated.");
      return;
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `${entityType}/${entityId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setLoading(false);
      setError("Upload failed.");
      return;
    }

    // Insert evidence and RETURN the new row
    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          title,
          summary,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          user_id: user.id,
          evidence_type: evidenceType,
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      setLoading(false);
      setError("Database insert failed.");
      return;
    }

    // Redirect to the new Evidence Page
    router.push(`/evidence/${inserted.id}`);

    setLoading(false);
    setSuccess(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Submit Evidence</h2>

      {/* Evidence Type Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Evidence Type</label>
        <select
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="misconduct">Misconduct</option>
          <option value="remediation">Remediation</option>
          <option value="correction">Correction</option>
          <option value="audit">Audit</option>
          <option value="statement">Statement</option>
        </select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Summary (optional)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* File */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">File</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2 rounded w-full"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        Submit Evidence
      </button>

      {error && <p className="text-red-600 mt-2">{error}</p>}
      {success && (
        <p className="text-green-600 mt-2">Evidence submitted for moderation.</p>
      )}
    </div>
  );
}
