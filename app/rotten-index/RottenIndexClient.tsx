 "use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Company = {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
};

export default function RottenIndexClient({
  initialCountry,
  initialOptions,
}: {
  initialCountry?: string | null;
  initialOptions?: { dbValue: string; label: string }[];
}) {
  const [country, setCountry] = useState<string>(initialCountry || "");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = initialOptions || [];

  async function fetchList(selected: string) {
    try {
      setLoading(true);
      setError(null);
      setCompanies(null);

      const q = selected ? `?country=${encodeURIComponent(selected)}` : "";
      console.log("[RottenIndexClient] Fetching companies with country:", selected, "URL:", `/api/rotten-index${q}`);
      const res = await fetch(`/api/rotten-index${q}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const body = await res.json();
      console.log("[RottenIndexClient] Received", body.companies?.length || 0, "companies");
      setCompanies(body.companies || []);
    } catch (err: any) {
      console.error("[RottenIndexClient] fetch error:", err);
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial fetch
    fetchList(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update state if initialCountry prop changes (e.g., navigation)
  useEffect(() => {
    if (initialCountry !== undefined && initialCountry !== country) {
      console.log("[RottenIndexClient] initialCountry changed to:", initialCountry);
      setCountry(initialCountry || "");
      fetchList(initialCountry || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCountry]);

  return (
    <section>
      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="country" className="text-gray-600">Country:</label>

        <select
          id="country"
          name="country"
          value={country}
          onChange={(e) => {
            const v = e.target.value || "";
            console.log("[RottenIndexClient] Dropdown changed to:", v);
            setCountry(v);
            // Update URL without full reload for UX
            const url = v ? `/rotten-index?country=${encodeURIComponent(v)}` : `/rotten-index`;
            window.history.replaceState({}, "", url);
            console.log("[RottenIndexClient] Calling fetchList with:", v);
            fetchList(v);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">All countries</option>
          {options.map((opt) => (
            <option key={opt.dbValue} value={opt.dbValue}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-600">Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && companies && companies.length === 0 && (
        <p className="text-gray-600">No companies found{country ? ` for ${country}` : ""}.</p>
      )}

      {!loading && !error && companies && companies.length > 0 && (
        <>
          {console.log("[RottenIndexClient] Rendering", companies.length, "companies:", companies.map(c => `${c.name} (${c.country})`).join(", "))}
          <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {companies.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-gray-500 font-mono w-6 text-right">{i + 1}.</span>
                <div>
                  <Link href={`/company/${c.slug}`} className="text-lg font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {c.industry || "Unknown industry"}
                    {c.country ? ` · ${c.country}` : ""}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">{c.rotten_score.toFixed(1)}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Rotten Score</div>
              </div>
            </li>
          ))}
        </ol>
        </>
      )}
    </section>
  );
}
