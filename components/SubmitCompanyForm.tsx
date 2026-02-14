"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const COUNTRIES = [
  "Denmark",
  "United Kingdom",
  "Germany",
  "United Arab Emirates",
  "Indonesia",
  // add others as needed
];

export default function SubmitCompanyForm() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [name, setName] = useState("");
  const [country, setCountry] = useState<string>("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to submit a company.");
        setSubmitting(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("companies")
        .insert({
          name: name.trim(),
          country: country || null,
          industry: industry.trim() || null,
          description: description.trim() || null,
          created_by: user.id,
        })
        .select("slug")
        .maybeSingle();

      if (insertError) {
        console.error("[SubmitCompanyForm] insert error", insertError);
        setError("Failed to submit company.");
        setSubmitting(false);
        return;
      }

      if (data?.slug) {
        router.push(`/company/${data.slug}`);
      } else {
        setSubmitting(false);
      }
    } catch (err) {
      console.error("[SubmitCompanyForm] unexpected error", err);
      setError("Unexpected error submitting company.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium">Company name *</label>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Country</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={submitting}
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Industry</label>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={4}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit company"}
      </button>
    </form>
  );
}
