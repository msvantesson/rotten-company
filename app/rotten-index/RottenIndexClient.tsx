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
  const [error, setError] = useState<string | null>(null);
  const loadErrorMessage = "Unable to load the Rotten Index. Please try again.";

  async function fetchList(selected: string) {
    setLoading(true);
    setError(null);
    try {
      const q = selected ? `?country=${encodeURIComponent(selected)}` : "";
      const res = await fetch(`/api/rotten-index${q}`, { cache: "no-store" });

      if (!res.ok) {
        console.warn("[RottenIndexClient] list_fetch_failed", { status: res.status });
        setCompanies([]);
        setError(loadErrorMessage);
        return;
      }

      const responseText = await res.text();

      if (!responseText.trim()) {
        console.warn("[RottenIndexClient] list_response_empty");
        setCompanies([]);
        setError(loadErrorMessage);
        return;
      }

      let body: unknown;
      try {
        body = JSON.parse(responseText);
      } catch {
        console.warn("[RottenIndexClient] list_response_parse_failed");
        setCompanies([]);
        setError(loadErrorMessage);
        return;
      }

      const rows =
        body && typeof body === "object" && "companies" in body && Array.isArray((body as { companies?: unknown }).companies)
          ? ((body as { companies: Company[] }).companies ?? [])
          : [];

      setCompanies(rows);
    } catch {
      console.error("[RottenIndexClient] list_fetch_error");
      setCompanies([]);
      setError(loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList(country);
  }, []);

  return (
    <section className="mb-6">
      <div className="flex items-center gap-4 mb-6">
        <label htmlFor="country" className="text-muted-foreground">
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
          className="border border-border rounded px-2 py-1 text-sm bg-surface text-foreground"
        >
          <option value="">All countries</option>
          {initialOptions.map((opt) => (
            <option key={opt.dbValue} value={opt.dbValue}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && error && <p className="text-muted-foreground">{error}</p>}

      {!loading && !error && companies && companies.length === 0 && (
        <p className="text-muted-foreground">No companies found.</p>
      )}

      {!loading && companies && companies.length > 0 && (
        <ol className="divide-y divide-border border border-border rounded-lg">
          {companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/company/${c.slug}`} className="text-lg font-semibold hover:underline">
                  {c.name}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {c.industry || "Unknown industry"}
                  {c.country ? ` · ${c.country}` : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">{c.rotten_score.toFixed(1)}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Rotten Score</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
