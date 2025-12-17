"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface EvidenceUploadProps {
  entityId: number;
  entityType: "company" | "leader" | "manager" | "owner";
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD") // split accented characters
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9.\-_]/g, "-") // replace invalid chars
    .toLowerCase();
}

export default function EvidenceUpload({
  entityId,
  entityType,
}: EvidenceUploadProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

    const safeName = sanitizeFileName(file.name);
    const filePath = `${entityType}/${entityId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, file, {
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setLoading(false);
      setError("Upload failed.");
      return;
    }

    const { error: insertError } = await supabase.from("evidence").insert([
      {
        entity_type: entityType,
        entity_id: entityId,
        title,
        summary,
        file_path: filePath,
      },
    ]);

    if (insertError) {
      console.error("Insert error:", insertError);
      setLoading(false);
      setError("Database insert failed.");
      return;
    }

    setLoading(false);
    setSuccess(true);
    setTitle("");
    setSummary("");
    setFile(null);
  };

  return (
    <div>
      <h2>Submit Evidence</h2>

      <label>Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label>Summary (optional)</label>
      <input
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />

      <label>File</label>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleSubmit} disabled={loading}>
        Submit Evidence
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && (
        <p style={{ color: "green" }}>Evidence submitted for moderation.</p>
      )}
    </div>
  );
}
