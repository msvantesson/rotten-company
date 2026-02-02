"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logDebug } from "@/lib/log";

export default function CompanyRequestClient() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillName = params.get("name") ?? "";

  const [name, setName] = useState(prefillName);
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [why, setWhy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !why.trim()) {
      setError("Company name and 'why' are required.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        name: name.trim(),
        country: country.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        why: why.trim(),
      };

      logDebug("company-request-form", "Submitting", body);

      const res = await fetch("/api/company/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      setSuccess(true);

      if (json.redirectTo) router.push(json.redirectTo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      {/* JSX unchanged */}
    </main>
  );
}
