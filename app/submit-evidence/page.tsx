import dynamic from "next/dynamic";
import React from "react";

const CompanyAutocomplete = dynamic(
  () => import("@/components/CompanyAutocomplete"),
  { ssr: false },
);

export default function SubmitEvidencePage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <CompanyAutocomplete />
    </div>
  );
}
