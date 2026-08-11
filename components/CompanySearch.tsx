"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MacroTierBadge from "@/components/MacroTierBadge";

type Company = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  industry?: string | null;
  rotten_score?: number | null;
};

type SelectModeProps = {
  /** Optional id for the underlying input (useful for external label htmlFor) */
  inputId?: string;
  mode: "select";
  /** Name of the hidden input carrying selected company id in FormData */
  fieldName?: string;
  /** Called when selection changes */
  onChange?: (company: Company | null) => void;
};

type NavigateModeProps = {
  mode: "navigate";
};

type Props = SelectModeProps | NavigateModeProps;

export default function CompanySearch(props: Props) {
  const uid = useId();
  const listboxId = `company-search-results-${uid}`;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Debounced search via /api/search-entities (canonical score from global_rotten_index)
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
        const res = await fetch(
          `/api/search-entities?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" },
        );

        if (cancelled) return;

        if (!res.ok) {
          setSearchError("Search failed");
          setResults([]);
          return;
        }

        const body: { results: Company[] } = await res.json();
        setResults(body.results ?? []);
        setOpen(true);
        setHighlightIndex(0);
      } catch {
        if (!cancelled) setSearchError("Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  function scrollIntoView(index: number) {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[index] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function chooseCompany(c: Company) {
    if (props.mode === "navigate") {
      router.push(`/company/${c.slug}`);
      setQuery(c.name);
      setOpen(false);
    } else {
      setSelectedCompany(c);
      setQuery(c.name);
      setOpen(false);
      props.onChange?.(c);
    }
  }

  function clearSelection() {
    setSelectedCompany(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    if (props.mode === "select") props.onChange?.(null);
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

  const isNavigate = props.mode === "navigate";
  const inputId = props.mode === "select" && props.inputId ? props.inputId : `${listboxId}-input`;

  return (
    <div>
      {props.mode === "select" && (
        <input type="hidden" name={props.fieldName ?? "company_id"} value={selectedCompany?.id ?? ""} />
      )}

      {(!selectedCompany || isNavigate) && (
        <div className="relative">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            autoComplete="off"
            placeholder={isNavigate ? "Search companies by name…" : "Type to search approved companies..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            className="block w-full border border-border rounded-md px-3 py-2 bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={open}
            role="combobox"
          />

          <div className="mt-1">
            {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
            {searchError && <p className="text-xs text-red-600">{searchError}</p>}
          </div>

          {open && results.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              ref={listRef}
              className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-surface shadow-lg list-none p-0 m-0"
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{c.name}</div>
                        {(c.country || c.industry) && (
                          <div className="text-xs text-muted-foreground truncate">
                            {[c.industry, c.country].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      {c.rotten_score != null && isNavigate && (
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-mono tabular-nums text-muted-foreground">
                            {c.rotten_score.toFixed(1)}
                          </div>
                          <MacroTierBadge score={c.rotten_score} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {open && !loading && !searchError && results.length === 0 && query.trim().length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground shadow-lg">
              No company found for &ldquo;{query.trim()}&rdquo;
              <div className="mt-2">
                <a
                  href={`/submit-company?name=${encodeURIComponent(query.trim())}`}
                  className="text-accent underline"
                >
                  Suggest this company →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {!isNavigate && selectedCompany && (
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

      {!isNavigate && (
        <p className="text-xs text-muted-foreground mt-2">
          Only approved companies are listed. If the company is missing,{" "}
          <a href="/submit-company" className="text-accent underline">
            request a new company
          </a>
          .
        </p>
      )}
    </div>
  );
}
