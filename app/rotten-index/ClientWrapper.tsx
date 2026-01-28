"use client";

import { useRouter, useSearchParams } from "next/navigation";

type NormalizationMode = "none" | "employees" | "revenue";

type ClientWrapperProps = {
  initialCountry: string | null;
  normalization: NormalizationMode;
};

export default function ClientWrapper({
  initialCountry,
  normalization,
}: ClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/rotten-index?${params.toString()}`);
  }

  return (
    <section className="flex gap-4 items-center">
      <label>
        Country:
        <input
          className="ml-2 border px-2 py-1"
          defaultValue={initialCountry ?? ""}
          onBlur={(e) =>
            updateParam("country", e.target.value || null)
          }
        />
      </label>

      <label>
        Normalize:
        <select
          className="ml-2 border px-2 py-1"
          defaultValue={normalization}
          onChange={(e) =>
            updateParam("normalization", e.target.value)
          }
        >
          <option value="none">None</option>
          <option value="employees">Per employee</option>
          <option value="revenue">Per revenue</option>
        </select>
      </label>
    </section>
  );
}
