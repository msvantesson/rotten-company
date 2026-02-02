"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logDebug } from "@/lib/log";

export default function CompanyRequestPage() {
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
        const text = await res.text();
        throw new Error(text || "Failed to submit request");
      }

      const json = await res.json();
      logDebug("company-request-form", "Submitted", json);

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
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Request a new company</h1>
        <p className="text-sm text-neutral-600">
          Tell us which company should be added and why. A moderator will review your request.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Why *</label>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-600">
            Request submitted successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </main>
  );
}
