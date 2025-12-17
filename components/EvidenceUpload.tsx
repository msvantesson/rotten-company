"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  entityId: number;
  entityType: "company" | "leader" | "manager" | "owner";
};

export function EvidenceUpload({ entityId, entityType }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  const maxSizeMB = {
    "image/jpeg": 5,
    "image/png": 5,
    "image/webp": 5,
    "application/pdf": 10,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported file type.");
      return;
    }

    const maxMB = maxSizeMB[file.type];
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File exceeds ${maxMB}MB limit.`);
      return;
    }

    setLoading(true);

    const filePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, file);

    if (uploadError) {
      setLoading(false);
      setError("Upload failed.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("evidence")
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;

    const insertPayload: any = {
      title,
      summary,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      status: "pending",
    };

    if (entityType === "company") insertPayload.company_id = entityId;
    if (entityType === "leader") insertPayload.leader_id = entityId;
    if (entityType === "manager") insertPayload.manager_id = entityId;
    if (entityType === "owner") insertPayload.owner_id = entityId;

    const { error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload);

    setLoading(false);

    if (insertError) {
      setError("Failed to save evidence.");
      return;
    }

    setSuccess(true);
    setTitle("");
    setSummary("");
    setFile(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md">
      <h3 className="font-semibold text-lg">Submit Evidence</h3>

      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          className="border p-2 w-full rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Summary (optional)</label>
        <textarea
          className="border p-2 w-full rounded"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">File</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && (
        <p className="text-green-600 text-sm">
          Evidence submitted for moderation.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Evidence"}
      </button>
    </form>
  );
}
