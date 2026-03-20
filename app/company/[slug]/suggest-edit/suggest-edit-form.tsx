"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EMPLOYEE_RANGES } from "@/lib/constants/employee-ranges";
import { INDUSTRIES } from "@/lib/constants/industries";

type Props = {
  companySlug: string;
  currentValues: {
    website: string;
    industry: string;
    description: string;
    country: string;
    size_employees: string;
    size_employees_range: string;
  };
};

/**
 * Derive the initial employee-range label to pre-select in the dropdown.
 * Prefers `size_employees_range` (stored label) if it matches a known range;
 * falls back to finding the closest range from the numeric `size_employees`.
 */
function deriveInitialRange(currentValues: Props["currentValues"]): string {
  if (currentValues.size_employees_range) {
    const match = EMPLOYEE_RANGES.find(
      (r) => r.label === currentValues.size_employees_range
    );
    if (match) return match.label;
  }
  if (currentValues.size_employees) {
    const num = parseInt(currentValues.size_employees, 10);
    if (!isNaN(num) && num >= 0) {
      // Find the range where num >= min, picking the highest matching min
      const sorted = [...EMPLOYEE_RANGES].sort((a, b) => b.min - a.min);
      const match = sorted.find((r) => num >= r.min);
      if (match) return match.label;
    }
  }
  return "";
}

export default function SuggestEditForm({ companySlug, currentValues }: Props) {
  const router = useRouter();

  const [website, setWebsite] = useState(currentValues.website);
  const [industry, setIndustry] = useState(currentValues.industry);
  const [description, setDescription] = useState(currentValues.description);
  const [country, setCountry] = useState(currentValues.country);
  const [sizeEmployees, setSizeEmployees] = useState(
    deriveInitialRange(currentValues)
  );
  const [why, setWhy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!why.trim()) {
      setError("Please explain why you are suggesting this edit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/company/suggest-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug,
          website: website.trim() || null,
          industry: industry.trim() || null,
          description: description.trim() || null,
          country: country.trim() || null,
          size_employees: sizeEmployees || null,
          why: why.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      router.push(`/company/${companySlug}/suggest-edit/thank-you`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">
          Website
          <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank to keep current)</span>
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder={currentValues.website || "https://example.com"}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Industry
          <span className="ml-1 text-xs text-gray-400 font-normal">(optional; leave blank to keep current)</span>
        </label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white"
        >
          <option value="">Select industry (or keep current)</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Description
          <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank to keep current)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={currentValues.description || "Short description of the company"}
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Country (Headquarters)
          <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank to keep current)</span>
        </label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={currentValues.country || "e.g. Sweden"}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Number of Employees
          <span className="ml-1 text-xs text-gray-400 font-normal">(optional; leave blank to keep current)</span>
        </label>
        <select
          value={sizeEmployees}
          onChange={(e) => setSizeEmployees(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm bg-white"
        >
          <option value="">Select range</option>
          {EMPLOYEE_RANGES.map((r) => (
            <option key={r.label} value={r.label}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Why are you suggesting this edit? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          required
          placeholder="Explain the reason for your suggested correction"
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit suggestion"}
      </button>
    </form>
  );
}
