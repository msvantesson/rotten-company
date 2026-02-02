"use client";

import { useState } from "react";
import Link from "next/link";
import { logDebug } from "@/lib/log";

type SearchResult = {
  name: string;
  slug: string;
  submitEvidenceUrl: string;
};

export default function ContributeFindPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/search-entities?q=${encodeURIComponent(query.trim())}`
      );
      const json = await res.json();
      logDebug("contribute-find", "Search results", json);
      setResults(json.results || []);
    } catch (err) {
      logDebug("contribute-find", "Search error", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Find a company</h1>
        <p className="text-sm text-neutral-600">
          Search for a company to submit evidence about.
        </p>
      </header>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            placeholder="Start typing a company name..."
          />
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Search
          </button>
        </div>
      </form>

      {touched && !loading && results.length === 0 && query.trim() && (
        <div className="space-y-2 border rounded-lg p-4">
          <p className="text-sm text-neutral-700">
            No companies found matching “{query.trim()}”.
          </p>
          <Link
            href={`/company/request?name=${encodeURIComponent(query.trim())}`}
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            Request “{query.trim()}”
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-700">
            Matching companies
          </h2>
          <ul className="space-y-2">
            {results.map((r) => (
              <li
                key={r.slug}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                </div>
                <Link
                  href={r.submitEvidenceUrl}
                  className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  Submit evidence
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
