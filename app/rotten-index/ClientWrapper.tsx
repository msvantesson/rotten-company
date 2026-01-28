"use client";

import { useRouter, useSearchParams } from "next/navigation";

type NormalizationMode = "none" | "employees" | "revenue";

type ClientWrapperProps = {
  initialCountry: string | null;
  initialOptions: { dbValue: string; label: string }[];
  normalization: NormalizationMode;
};

export default function ClientWrapper({
  initialCountry,
  initialOptions,
  normalization,
}: ClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value.trim().length === 0) params.delete(key);
    else params.set(key, value);
    router.push(`/rotten-index?${params.toString()}`);
  }

  return (
    <section className="flex flex-wrap items-center gap-4">
      <label className="text-sm font-medium">
        Country:
        <select
          className="ml-2 border rounded px-2 py-1"
          value={initialCountry ?? ""}
          onChange={(e) => updateParam("country", e.target.value || null)}
        >
          <option value="">All countries</option>
          {initialOptions.map((opt) => (
            <option key={opt.dbValue} value={opt.dbValue}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Normalize:
        <select
          className="ml-2 border rounded px-2 py-1"
          value={normalization}
          onChange={(e) => updateParam("normalization", e.target.value)}
        >
          <option value="none">None</option>
          <option value="employees">Per employee</option>
          <option value="revenue">Per revenue</option>
        </select>
      </label>
    </section>
  );
}
