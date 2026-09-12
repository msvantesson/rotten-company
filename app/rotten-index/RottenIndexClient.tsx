"use client";

import React, { useState } from "react";
import Link from "next/link";
import MacroTierBadge from "@/components/MacroTierBadge";
import ExportCsvButton from "./ExportCsvButton";
import CompanyCardList from "./CompanyCardList";
import FindCompanyInline from "./FindCompanyInline";

type IndexType = "company" | "leader";
type SortField = "rotten_score" | "approved_evidence_count" | "name" | "industry";

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number | null;
  industry?: string | null;
  approved_evidence_count?: number;
  leader_id?: number;
  tenure_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

const DEFAULT_SORT_DIRS: Record<SortField, "asc" | "desc"> = {
  rotten_score: "desc",
  approved_evidence_count: "desc",
  name: "asc",
  industry: "asc",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

function formatCountry(value: string) {
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function buildSearch(type: IndexType, country: string, limit: number, q: string, sort: SortField, dir: "asc" | "desc") {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("limit", String(limit));

  if (country) {
    params.set("country", country);
  }

  if (type === "company") {
    if (q.trim()) {
      params.set("q", q.trim());
    }
    params.set("sort", sort);
    params.set("dir", dir);
  }

  return params.toString();
}

async function parseRows(response: Response): Promise<IndexedRow[]> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    console.warn("[RottenIndexClient] list_response_empty");
    throw new Error("empty");
  }

  let body: unknown;
  try {
    body = JSON.parse(responseText);
  } catch {
    console.warn("[RottenIndexClient] list_response_parse_failed");
    throw new Error("parse");
  }

  if (!body || typeof body !== "object" || !("rows" in body) || !Array.isArray((body as { rows?: unknown }).rows)) {
    return [];
  }

  return (body as { rows: IndexedRow[] }).rows ?? [];
}

export default function RottenIndexClient({
  initialType,
  initialCountry,
  initialLimit,
  initialQuery,
  initialSort,
  initialDir,
  initialRows,
  initialOptions,
}: {
  initialType: IndexType;
  initialCountry: string | null;
  initialLimit: number;
  initialQuery: string | null;
  initialSort: SortField;
  initialDir: "asc" | "desc";
  initialRows: IndexedRow[];
  initialOptions: string[];
}) {
  const [type, setType] = useState<IndexType>(initialType);
  const [country, setCountry] = useState(initialCountry ?? "");
  const [limit, setLimit] = useState(initialLimit);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [sort, setSort] = useState<SortField>(initialSort);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const [rows, setRows] = useState<IndexedRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadErrorMessage = "Unable to load the Rotten Index. Please try again.";

  const safeCountry = (country || "all-countries").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const fileName = `rotten-index_${type}_${safeCountry}_top${limit}.csv`;

  async function fetchList(nextType: IndexType, nextCountry: string, nextLimit: number, nextQuery: string, nextSort: SortField) {
    setLoading(true);
    setError(null);
    try {
      const search = buildSearch(nextType, nextCountry, nextLimit, nextQuery, nextSort, dir);
      const res = await fetch(`/api/rotten-index?${search}`, { cache: "no-store" });

      if (!res.ok) {
        console.warn("[RottenIndexClient] list_fetch_failed", { status: res.status });
        setRows([]);
        setError(loadErrorMessage);
        return;
      }

      const nextRows = await parseRows(res);
      setRows(nextRows);
    } catch {
      console.error("[RottenIndexClient] list_fetch_error");
      setRows([]);
      setError(loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = buildSearch(type, country, limit, query, sort, dir);
    window.history.replaceState({}, "", search ? `/rotten-index?${search}` : "/rotten-index");
    await fetchList(type, country, limit, query, sort);
  }

  const companyRows = type === "company" ? rows.filter((row) => row.rotten_score != null) : [];

  return (
    <>
      {type === "company" && <FindCompanyInline />}

      <form method="get" onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface-2 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-1">Entity</label>
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value === "leader" ? "leader" : "company")}
              className="h-10 border border-border rounded-md px-3 py-2 text-sm bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="company">Companies</option>
              <option value="leader">Leaders</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-1">Country</label>
            <select
              name="country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="h-10 border border-border rounded-md px-3 py-2 text-sm bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All countries</option>
              {initialOptions.map((option) => (
                <option key={option} value={option}>
                  {formatCountry(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-muted-foreground mb-1">Results</label>
            <select
              name="limit"
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value) || 10)}
              className="h-10 border border-border rounded-md px-3 py-2 text-sm bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="10">Top 10</option>
              <option value="25">Top 25</option>
              <option value="50">Top 50</option>
            </select>
          </div>

          {type === "company" && (
            <>
              <div className="flex flex-col col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-muted-foreground mb-1">Search</label>
                <input
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, industry, country…"
                  className="h-10 border border-border rounded-md px-3 py-2 text-sm bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground mb-1">Sort by</label>
                <select
                  name="sort"
                  value={sort}
                  onChange={(event) => {
                    const nextSort = event.target.value as SortField;
                    setSort(nextSort);
                    setDir(DEFAULT_SORT_DIRS[nextSort]);
                  }}
                  className="h-10 border border-border rounded-md px-3 py-2 text-sm bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rotten_score">Rotten Score</option>
                  <option value="approved_evidence_count">Evidence Count</option>
                  <option value="name">Name</option>
                  <option value="industry">Industry</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-1 border-t border-border">
          <ExportCsvButton tableId="rotten-index-table" filename={fileName} />
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            Apply
          </button>
        </div>
      </form>

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {!loading && error && <p className="text-muted-foreground">{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="text-muted-foreground">No companies found.</p>}

      {!loading && !error && rows.length > 0 && (
        <>
          {type === "company" && (
            <div className="md:hidden">
              <CompanyCardList rows={companyRows} />
            </div>
          )}

          <div className={`overflow-x-auto rounded-lg border border-border${type === "company" ? " hidden md:block" : ""}`}>
            <table id="rotten-index-table" className="w-full border-collapse text-sm">
              <thead className="bg-muted border-b border-border">
                {type === "leader" ? (
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-2 pl-4 w-12 text-left">#</th>
                    <th className="py-3 pr-4 text-left">CEO Name</th>
                    <th className="py-3 pr-4 text-left">Company</th>
                    <th className="py-3 pr-4 text-left">Country</th>
                    <th className="py-3 pr-4 text-left">Started</th>
                    <th className="py-3 pr-4 text-left">Ended</th>
                    <th className="py-3 pr-4 text-right">Rotten Score</th>
                  </tr>
                ) : (
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-2 pl-4 w-12 text-left">#</th>
                    <th className="py-3 pr-4 text-left">Name</th>
                    <th className="py-3 pr-4 text-left">Country</th>
                    <th className="py-3 pr-4 text-left">Industry</th>
                    <th className="py-3 pr-4 text-right">Evidence</th>
                    <th className="py-3 pr-4 text-right">Rotten Score</th>
                    <th className="px-4 py-3 text-center min-w-[240px]">Status</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((row, index) =>
                  type === "leader" ? (
                    <tr key={`leader-${row.id}`} className="border-b border-border hover:bg-muted last:border-0 transition-colors">
                      <td className="py-3 pr-2 pl-4 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 pr-4 font-medium"><Link href={`/leader/${row.slug}`} className="text-accent hover:underline">{row.name}</Link></td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.company_slug ? <Link href={`/company/${row.company_slug}`} className="text-accent hover:underline">{row.company_name ?? "—"}</Link> : (row.company_name ?? "—")}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.country ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(row.started_at)}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.ended_at ? formatDate(row.ended_at) : row.started_at ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Current</span> : "—"}</td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums">{row.rotten_score != null ? row.rotten_score.toFixed(2) : "—"}</td>
                    </tr>
                  ) : (
                    <tr key={`company-${row.id}`} className="border-b border-border hover:bg-muted last:border-0 transition-colors">
                      <td className="py-3 pr-2 pl-4 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 pr-4 font-medium"><Link href={`/${type}/${row.slug}`} className="text-accent hover:underline">{row.name}</Link></td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.country ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.industry ?? "—"}</td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums text-muted-foreground">{row.approved_evidence_count ?? 0}</td>
                      <td className="py-3 pr-4 text-right font-mono tabular-nums">{row.rotten_score != null ? row.rotten_score.toFixed(2) : "—"}</td>
                      <td className="px-4 py-3 text-center align-middle min-w-[240px]">{row.rotten_score != null ? <MacroTierBadge score={row.rotten_score} /> : <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
