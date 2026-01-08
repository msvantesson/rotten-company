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
  initialCountry: string | null;
  initialOptions: { dbValue: string; label: string }[];
}) {
  const [country, setCountry] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      return url.searchParams.get("country") || "";
    }
    return initialCountry || "";
  });

  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchList(selected: string) {
    setLoading(true);
    const q = selected ? `?country=${encodeURIComponent(selected)}` : "";
    const res = await fetch(`/api/rotten-index${q}`, { cache: "no-store" });
    const body = await res.json();
    setCompanies(body.companies || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchList(country);
  }, []);

  return (
    <section className="mb-6">
      <div className="flex items-center gap-4 mb-6">
        <label htmlFor="country" className="text-gray-600">
          Country:
        </label>

        <select
          id="country"
          value={country}
          onChange={(e) => {
            const v = e.target.value;
            setCountry(v);

            const url = v ? `/rotten-index?country=${encodeURIComponent(v)}` : `/rotten-index`;
            window.history.replaceState({}, "", url);

            fetchList(v);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        >
          <option value="">All countries</option>
          {initialOptions.map((opt) => (
            <option key={opt.dbValue} value={opt.dbValue}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-600">Loading…</p>}

      {!loading && companies && companies.length === 0 && (
        <p className="text-gray-600">No companies found.</p>
      )}

      {!loading && companies && companies.length > 0 && (
        <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {companies.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/company/${c.slug}`} className="text-lg font-semibold hover:underline">
                  {c.name}
                </Link>
                <div className="text-sm text-gray-500">
                  {c.industry || "Unknown industry"}
                  {c.country ? ` · ${c.country}` : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">{c.rotten_score.toFixed(1)}</div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Rotten Score</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
