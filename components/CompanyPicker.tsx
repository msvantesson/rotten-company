"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
};

type Props = {
  /** Name of the hidden <input> that will carry the selected company id in FormData */
  fieldName?: string;
  /** Called whenever the selection changes (null = cleared) */
  onChange?: (company: Company | null) => void;
};

export default function CompanyPicker({ fieldName = "pe_owner_id", onChange }: Props) {
  const supabase = supabaseBrowser();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSearchError(null);

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
          console.error("[CompanyPicker] search error", error);
          setSearchError("Search failed");
          setResults([]);
        } else {
          setResults((data ?? []) as Company[]);
          setOpen(true);
          setHighlightIndex(0);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setSearchError("Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, supabase]);

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
    onChange?.(c);
  }

  function clearSelection() {
    setSelectedCompany(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange?.(null);
    inputRef.current?.focus();
  }

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
      const next = Math.min(highlightIndex + 1, results.length - 1);
      setHighlightIndex(next);
      scrollIntoView(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(highlightIndex - 1, 0);
      setHighlightIndex(prev);
      scrollIntoView(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        chooseCompany(results[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div>
      {/* Hidden input carries the id in FormData */}
      <input type="hidden" name={fieldName} value={selectedCompany?.id ?? ""} />

      {!selectedCompany && (
        <div className="relative">
          <input
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
            className="block w-full border border-border rounded px-3 py-2 bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-autocomplete="list"
            aria-controls="pe-company-results"
            aria-expanded={open}
            role="combobox"
          />

          <div className="mt-2">
            {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
            {searchError && <p className="text-xs text-red-600">{searchError}</p>}
          </div>

          {open && results.length > 0 && (
            <ul
              id="pe-company-results"
              role="listbox"
              ref={listRef}
              className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded border border-border bg-surface shadow list-none p-0 m-0"
            >
              {results.map((c, idx) => {
                const isHighlighted = idx === highlightIndex;
                return (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseCompany(c);
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`px-3 py-2 cursor-pointer ${isHighlighted ? "bg-muted" : ""}`}
                  >
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.slug ? <div className="text-xs text-muted-foreground">{c.slug}</div> : null}
                  </li>
                );
              })}
            </ul>
          )}

          {open && !loading && results.length === 0 && (
            <div className="absolute z-20 mt-1 w-full rounded border border-border bg-surface p-3 text-sm text-muted-foreground shadow">
              No matching companies found.
              <div className="mt-2">
                <a href="/submit-company" className="text-accent underline">
                  Request a new company
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCompany && (
        <div className="rounded border border-border p-3 bg-surface flex justify-between items-center">
          <div>
            <div className="text-xs text-muted-foreground">Selected company</div>
            <div className="font-medium text-sm">{selectedCompany.name}</div>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-sm text-accent underline bg-transparent border-none cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Only approved companies are listed. If the company is missing,{" "}
        <a href="/submit-company" className="text-accent underline">
          request a new company
        </a>
        .
      </p>
    </div>
  );
}
