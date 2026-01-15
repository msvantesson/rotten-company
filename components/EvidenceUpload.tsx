"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 8 * 1024 * 1024; // 8MB

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

  const [severity, setSeverity] = useState<number>(3);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const compressionLinks = {
    images: "https://tinypng.com",
    pdfs: "https://www.ilovepdf.com/compress_pdf",
    pdfsAlt: "https://smallpdf.com/compress-pdf",
  };

  const handleSubmit = async () => {
    setError("");

    if (!title) {
      setError("Title is required.");
      return;
    }

    if (!file) {
      setError("Please attach a file.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    // Client-side size checks
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      setError(
        `Image too large. Max size is 3MB. Try compressing at ${compressionLinks.images}.`
      );
      return;
    }

    if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
      setError(
        `PDF too large. Max size is 8MB. Try compressing at ${compressionLinks.pdfs} or ${compressionLinks.pdfsAlt}.`
      );
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file, sanitizeFileName(file.name));
      form.append("title", title);
      form.append("summary", summary);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      form.append("categoryId", String(categoryId));
      form.append("severity", String(severity));
      form.append("evidenceType", evidenceType);

      const res = await fetch("/submit-evidence", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Upload failed.");
        setLoading(false);
        return;
      }

      // Redirect to evidence detail
      router.push(`/my-evidence/${json.evidence_id}`);
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

      <div className="space-y-1">
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Summary (optional)</label>
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">File</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border p-2 rounded w-full"
        />
        <div className="text-xs text-gray-500 mt-1">
          Max image size 3MB. Max PDF size 8MB. If your file is larger, try:
          <div>
            <a href={compressionLinks.images} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              TinyPNG for images
            </a>
            {" • "}
            <a href={compressionLinks.pdfs} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              iLovePDF for PDFs
            </a>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Submit Evidence"}
      </button>

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
