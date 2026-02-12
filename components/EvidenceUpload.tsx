"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const MAX_PDF_SIZE = 8 * 1024 * 1024;

export default function EvidenceUpload({ entityId, entityType }: EvidenceUploadProps) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<"misconduct" | "remediation">(
    "misconduct",
  );

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [severity, setSeverity] = useState<number>(3);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (!error && data) setCategories(data);
    }
    loadCategories();
  }, [supabase]);

  const handleSubmit = async () => {
    setError("");

    if (!title) return setError("Title is required.");
    if (!file) return setError("Please attach a file.");
    if (!categoryId) return setError("Please select a category.");

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      return setError("Image too large. Max size is 3MB.");
    }

    if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
      return setError("PDF too large. Max size is 8MB.");
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to submit evidence.");
        setLoading(false);
        return;
      }

      const form = new FormData();
      form.append("file", file, sanitizeFileName(file.name));
      form.append("title", title);
      form.append("summary", summary);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      form.append("category", String(categoryId));
      form.append("severity", String(severity));
      form.append("evidenceType", evidenceType);
      form.append("userId", user.id);

      const res = await fetch("/api/evidence/submit", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Upload failed.");
        setLoading(false);
        return;
      }

      router.push(`/my-evidence/${json.id}`);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Unexpected upload error.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Submit Evidence</h2>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Evidence Type</label>
        <select
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value as "misconduct" | "remediation")}
          className="border p-2 rounded w-full"
        >
          <option value="misconduct">Misconduct</option>
          <option value="remediation">Remediation</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Summary (optional)</label>
        <textarea
          className="border p-2 rounded w-full text-sm"
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Category</label>
        <select
          className="border p-2 rounded w-full"
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? Number(e.target.value) : null)
          }
          disabled={loading}
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Severity (1 = low, 5 = severe)
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          disabled={loading}
        />
        <p className="text-xs text-gray-600">Selected: {severity}</p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Attachment (image or PDF)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit evidence"}
      </button>
    </div>
  );
}
