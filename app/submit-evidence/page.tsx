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

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
};

type LeaderRow = {
  id: number;
  name: string;
  role?: string | null;
};

type ManagerRow = {
  id: number;
  name: string;
  role?: string | null;
};

type OwnerRow = {
  id: number;
  name: string;
  type?: string | null;
};

export default function SubmitEvidencePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runSearch = async () => {
      setError(null);
      setResults([]);

      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2) return;

      setLoading(true);

      try {
        const companiesRes = await supabase
          .from("companies")
          .select("id, name, slug")
          .or("name.ilike.%" + trimmed + "%,slug.ilike.%" + trimmed + "%")
          .limit(5);

        const leadersRes = await supabase
          .from("leaders")
          .select("id, name, role")
          .ilike("name", "%" + trimmed + "%")
          .limit(5);

        const managersRes = await supabase
          .from("managers")
          .select("id, name, role")
          .ilike("name", "%" + trimmed + "%")
          .limit(5);

        const ownersRes = await supabase
          .from("owners_investors")
          .select("id, name, type")
          .ilike("name", "%" + trimmed + "%")
          .limit(5);

        console.log("companies:", companiesRes);
        console.log("leaders:", leadersRes);
        console.log("managers:", managersRes);
        console.log("owners:", ownersRes);

        const next: SearchResult[] = [];

        if (companiesRes.data) {
          next.push(
            ...companiesRes.data.map((c: CompanyRow) => ({
              id: c.id,
              name: c.name,
              type: "company" as EntityType,
              extra: c.country ?? null,
            }))
          );
        }

        if (leadersRes.data) {
          next.push(
            ...leadersRes.data.map((l: LeaderRow) => ({
              id: l.id,
              name: l.name,
              type: "leader" as EntityType,
              extra: l.role ?? null,
            }))
          );
        }

        if (managersRes.data) {
          next.push(
            ...managersRes.data.map((m: ManagerRow) => ({
              id: m.id,
              name: m.name,
              type: "manager" as EntityType,
              extra: m.role ?? null,
            }))
          );
        }

        if (ownersRes.data) {
          next.push(
            ...ownersRes.data.map((o: OwnerRow) => ({
              id: o.id,
              name: o.name,
              type: "owner" as EntityType,
              extra: o.type ?? null,
            }))
          );
        }

        setResults(next);
      } catch (err) {
        console.error("Search error:", err);
        setError("There was a problem searching. Please try again.");
      } finally {
        setLoading(false);
      }
    };

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

      <div className="space-y-2">
        <label className="block text-sm font-medium">Search for an entity</label>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Type a company or person name..."
          className="border p-2 rounded w-full"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>

      {query.trim().length >= 2 && !selected && (
        <div className="border rounded p-3 space-y-2">
          {loading && <p className="text-sm text-gray-500">Searching…</p>}

          {!loading && results.length === 0 && (
            <p className="text-sm text-gray-500">No matching entities found.</p>
          )}

          {!loading &&
            results.map((result) => (
              <button
                key={result.type + "-" + result.id}
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

      {selected && (
        <div className="pt-4 border-t">
          <EvidenceUpload entityId={selected.id} entityType={selected.type} />
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-sm text-gray-600">
          Can&apos;t find the company you&apos;re looking for?
        </p>
        <a href="/submit-company" className="text-sm underline font-medium">
          Submit a new company
        </a>
      </div>
    </div>
  );
}
