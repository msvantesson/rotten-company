"use client";

import { useState } from "react";
import CompanySearch from "@/components/CompanySearch";
import EvidenceUpload from "@/components/EvidenceUpload";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
};

export default function CompanyAutocomplete() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Submit Evidence</h1>

      <div className="mb-6">
        <label htmlFor="company-autocomplete-input" className="block font-medium mb-2">
          Company <span className="text-red-600">*</span>
        </label>

        <CompanySearch
          mode="select"
          fieldName="company_id"
          inputId="company-autocomplete-input"
          onChange={(c) => setSelectedCompany(c)}
        />
      </div>

      {selectedCompany && (
        <div className="mt-6">
          <EvidenceUpload entityId={selectedCompany.id} entityType="company" />
        </div>
      )}
    </div>
  );
}
