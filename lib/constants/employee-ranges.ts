/**
 * Canonical company-size ranges.
 * `value` is stored in the database (company_requests.size_employees / companies.size_employees_range).
 * `label` is displayed to users.
 */
export const EMPLOYEE_RANGES: { value: string; label: string }[] = [
  { value: "1-50", label: "1–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "201-500", label: "201–500 employees" },
  { value: "501-1000", label: "501–1,000 employees" },
  { value: "1001-5000", label: "1,001–5,000 employees" },
  { value: "5001-10000", label: "5,001–10,000 employees" },
  { value: "10001-50000", label: "10,001–50,000 employees" },
  { value: "50001-100000", label: "50,001–100,000 employees" },
  { value: "100001-250000", label: "100,001–250,000 employees" },
  { value: "250001-500000", label: "250,001–500,000 employees" },
  { value: "500001-1000000", label: "500,001–1,000,000 employees" },
  { value: "1000001+", label: "1,000,001+ employees" },
];

export const ALLOWED_EMPLOYEE_RANGE_VALUES = EMPLOYEE_RANGES.map((r) => r.value);
