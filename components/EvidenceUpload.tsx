"use client";

import { useEffect, useState, useMemo } from "react";
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
  const [evidenceType, setEvidenceType] = useState("misconduct");

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
    // ... keep your existing logic here, using `supabase` ...
  };

  // ...rest of your JSX...
}
