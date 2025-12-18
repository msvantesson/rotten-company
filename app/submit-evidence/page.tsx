"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import EvidenceUpload from "@/components/EvidenceUpload";

type EntityType = "company" | "leader" | "manager" | "owner";

type SearchResult = {
  id: number;
  name: string;
  type: EntityType;
  extra?: string | null;
};

export default function SubmitEvidencePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple search when query changes
  useEffect(() => {
    const runSearch = async () => {
      setError(null);
      setResults([]);

      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) {
        // don't search on very short input
        return;
      }

      setLoading(true);

      try {
        // Basic, brute-force search across all four tables.
        // You can later replace this with a proper RPC or materialized view.
        const [companiesRes, leadersRes, managersRes, ownersRes] =
          await Promise.all([
            supabase
              .from("companies")
              .select("id, name, country")
              .ilike("name", `%${trimmed}%`)
              .limit(5),
            supabase
              .from("leaders")
              .select("id, name, role")
              .ilike("name", `%${trimmed}%`)
              .limit(5),
            supabase
              .from("managers")
              .select("id, name, role")
              .ilike("name", `%${trimmed}%`)
              .limit(5),
            supabase
              .from("owners_investors")
              .select("id, name, type")
              .ilike("name", `%${trimmed}%`)
              .limit(5),
          ]);

        const next: SearchResult[] = [];

        if (companiesRes.data) {
          next.push(
            ...companiesRes.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              type: "company" as const,
              extra: c.country ?? null,
            }))
          );
        }

        if (leadersRes.data) {
          next.push(
            ...leadersRes.data.map((l: any) => ({
              id: l.id,
              name: l.name,
              type: "leader" as const,
              extra: l.role ?? null,
            }))
          );
        }

        if (managersRes.data) {
          next.push(
            ...managersRes.data.map((m: any) => ({
              id: m.id,
              name: m.name,
              type: "manager" as const,
              extra: m.role ?? null,
            }))
          );
        }

        if (ownersRes.data) {
          next.push(
            ...ownersRes.data.map((o: any) => ({
              id: o.id,
              name: o.name,
              type: "owner" as const,
              extra: o.type ?? null,
            }))
          );
        }

        setResults(next);
      } catch (err) {
        console.error(err);
        setError("There was a problem searching. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // very light debounce
    const timeout = setTimeout(runSearch, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setSelected(result);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Submit Evidence</h1>

      <p className="text-sm text-gray-600">
        Find the company, leader, manager, or owner you want to submit evidence
        about. If you can&apos;t find them, you can submit a new company
        instead.
      </p>

      {/* Search input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Search for an entity
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null); // reset selection when query changes
          }}
          placeholder="Type a company or person name..."
          className="border p-2 rounded w-full"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>

      {/* Search results list */}
      {query.trim().length >= 2 && !selected && (
        <div className="border rounded p-3 space-y-2">
          {loading && (
            <p className="text-sm text-gray-500">Searching…</p>
          )}

          {!loading && results.length === 0 && (
            <p className="text-sm text-gray-500">
              No matching entities found.
            </p>
          )}

          {!loading &&
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-2 py-1 rounded hover:bg-gray-100"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{result.name}</span>
                  <span className="text-xs uppercase text-gray-500">
                    {result.type}
                  </span>
                </div>
                {result.extra && (
                  <div className="text-xs text-gray-500 mt-1">
                    {result.extra}
                  </div>
                )}
              </button>
            ))}
        </div>
      )}

      {/* Selected entity summary */}
      {selected && (
        <div className="border rounded p-3 bg-gray-50 space-y-1">
          <p className="text-sm text-gray-600">Submitting evidence about:</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{selected.name}</p>
              {selected.extra && (
                <p className="text-xs text-gray-500">{selected.extra}</p>
              )}
            </div>
            <span className="text-xs uppercase text-gray-500">
              {selected.type}
            </span>
          </div>
          <button
            type="button"
            className="text-xs text-gray-500 underline mt-1"
            onClick={() => setSelected(null)}
          >
            Choose a different entity
          </button>
        </div>
      )}

      {/* Evidence upload section */}
      {selected && (
        <div className="pt-4 border-t">
          <EvidenceUpload
            entityId={selected.id}
            entityType={selected.type}
          />
        </div>
      )}

      {/* Fallback: submit a new company */}
      <div className="pt-4 border-t">
        <p className="text-sm text-gray-600">
          Can&apos;t find the company you&apos;re looking for?
        </p>
        <a
          href="/submit-company"
          className="text-sm underline font-medium"
        >
          Submit a new company
        </a>
      </div>
    </div>
  );
}
