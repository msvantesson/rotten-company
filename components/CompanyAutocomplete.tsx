"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import EvidenceUpload from "@/components/EvidenceUpload";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
};

export default function CompanyAutocomplete() {
  const supabase = supabaseBrowser();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // combobox keyboard navigation
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // debounce search
  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const id = setTimeout(async () => {
      try {
        const q = query.trim();
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, slug")
          .ilike("name", `%${q}%`)
          .order("name", { ascending: true })
          .limit(25);

        if (cancelled) return;

        if (error) {
          console.error("[CompanyAutocomplete] search error", error);
          setError("Search failed");
          setResults([]);
        } else {
          setResults((data ?? []) as Company[]);
          setOpen(true);
          setHighlightIndex(0);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, supabase]);

  // handle keyboard navigation
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
      scrollIntoView(highlightIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      scrollIntoView(highlightIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        chooseCompany(results[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function scrollIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[index] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function chooseCompany(c: Company) {
    setSelectedCompany(c);
    setQuery(c.name);
    setOpen(false);
  }

  function clearSelection() {
    setSelectedCompany(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Submit Evidence</h1>

      <div className="mb-6">
        <label htmlFor="company-autocomplete" className="block font-medium mb-2">
          Company <span className="text-red-600">*</span>
        </label>

        {!selectedCompany && (
          <div className="relative">
            <input
              id="company-autocomplete"
              ref={inputRef}
              type="text"
              autoComplete="off"
              placeholder="Type to search approved companies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              className="block w-full border px-3 py-2 rounded"
              aria-autocomplete="list"
              aria-controls="company-results"
              aria-expanded={open}
              role="combobox"
            />

            <div className="mt-2">
              {loading && <p className="text-sm text-neutral-500">Searching…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {open && results.length > 0 && (
              <ul
                id="company-results"
                role="listbox"
                ref={listRef}
                className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded border bg-white shadow"
              >
                {results.map((c, idx) => {
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseDown={(e) => {
                        // mousedown so input doesn't lose focus before click
                        e.preventDefault();
                        chooseCompany(c);
                      }}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`px-3 py-2 cursor-pointer ${
                        isHighlighted ? "bg-neutral-100" : ""
                      }`}
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.slug ? (
                        <div className="text-xs text-neutral-500">{c.slug}</div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {open && !loading && results.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded border bg-white p-3 text-sm text-neutral-600 shadow">
                No matching companies found.
                <div className="mt-2">
                  <a href="/submit-company" className="text-blue-600 underline">
                    Request a new company
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedCompany && (
          <div className="rounded-md border p-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Selected company</div>
                <div className="font-medium">{selectedCompany.name}</div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-blue-600 underline"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-neutral-500 mt-2">
          Only approved companies are listed. If the company is missing,{" "}
          <a href="/submit-company" className="underline text-blue-600">
            request a new company
          </a>
          .
        </p>
      </div>

      {selectedCompany && (
        <div className="mt-6">
          <EvidenceUpload entityId={selectedCompany.id} entityType="company" />
        </div>
      )}
    </div>
  );
}
