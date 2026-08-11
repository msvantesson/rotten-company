"use client";

import CompanySearch from "@/components/CompanySearch";

export default function FindCompanySection() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Find a Company</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Search by name to open a company&apos;s profile and evidence record.
        </p>
      </div>
      <div className="max-w-md">
        <CompanySearch mode="navigate" />
      </div>
    </section>
  );
}
