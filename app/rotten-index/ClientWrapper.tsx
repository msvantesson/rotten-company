"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ClientWrapperProps = {
  initialCountry: string | null;
  initialOptions: {
    dbValue: string;
    label: string;
  }[];
};

export default function ClientWrapper({
  initialCountry,
  initialOptions,
}: ClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateCountry(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value.trim().length === 0) {
      params.delete("country");
    } else {
      params.set("country", value);
    }

    router.push(`/rotten-index?${params.toString()}`);
  }

  return (
    <section className="flex flex-wrap items-center gap-4">
      <label className="text-sm font-medium">
        Country:
        <select
          className="ml-2 border rounded px-2 py-1"
          defaultValue={initialCountry ?? ""}
          onChange={(e) => updateCountry(e.target.value || null)}
        >
          <option value="">All countries</option>
          {initialOptions.map((opt) => (
            <option key={opt.dbValue} value={opt.dbValue}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
