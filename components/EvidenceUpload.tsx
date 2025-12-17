"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .toLowerCase();
}

export default function EvidenceUpload() {
  const [entityType, setEntityType] = useState("company");
  const [entityId, setEntityId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    if (!entityType || !entityId || !title || !file) {
      setError("All fields except summary are required.");
      return;
    }

    setLoading(true);

    const safeName = sanitizeFileName(file.name);
    const filePath = `${entityType}/${entityId}/${Date.now()}-${safeName}`;

    const { data, error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, file, {
        upsert: false, // prevent overwriting existing files
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
        entity_id: Number(entityId),
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
      <h2>Evidence Upload Test</h2>

      <label>Entity Type</label>
      <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
        <option value="company">Company</option>
        <option value="leader">Leader</option>
        <option value="manager">Manager</option>
        <option value="owner">Owner</option>
      </select>

      <label>Entity ID</label>
      <input
        type="number"
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
      />

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
      {success && <p style={{ color: "green" }}>Evidence submitted for moderation.</p>}
    </div>
  );
}
