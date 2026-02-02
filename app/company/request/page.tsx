import { Suspense } from "react";
import CompanyRequestClient from "./request-client";

export default function CompanyRequestPage() {
  return (
    <Suspense fallback={null}>
      <CompanyRequestClient />
    </Suspense>
  );
}
