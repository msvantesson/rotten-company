"use client";

import { useEffect, useState } from "react";
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

  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [severity, setSeverity] = useState<number>(3); // default medium

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error loading categories:", error);
        return;
      }

      setCategories(data || []);
    }

    loadCategories();
  }, []);

  const handleSubmit = async () => {
    setError("");

    if (!title || !file) {
      setError("Title and file are required.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
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

    // Insert evidence with category + severity
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
          category_id: categoryId,
          severity_suggested: severity,
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

    router.push(`/evidence/${inserted.id}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Submit Evidence</h2>

      {/* Evidence Type */}
      <div className="space-y-1">
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

      {/* Category */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Category</label>
        <select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          className="border p-2 rounded w-full"
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Severity */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Severity (your suggestion)
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-gray-600">Selected: {severity}</div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Summary (optional)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* File */}
      <div className="space-y-1">
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

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
