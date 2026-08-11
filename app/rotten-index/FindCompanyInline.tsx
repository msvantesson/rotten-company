"use client";

import CompanySearch from "@/components/CompanySearch";

export default function FindCompanyInline() {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Find a Company
      </p>
      <CompanySearch mode="navigate" />
    </div>
  );
}
