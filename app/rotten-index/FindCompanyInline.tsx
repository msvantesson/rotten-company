"use client";

import CompanySearch from "@/components/CompanySearch";

export default function FindCompanyInline() {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Find a Company
      </label>
      <CompanySearch mode="navigate" />
    </div>
  );
}
