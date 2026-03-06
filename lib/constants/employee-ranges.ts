/**
 * Shared employee-range definitions used by both the submit-company flow
 * and the suggest-edit flow.
 */
export const EMPLOYEE_RANGES: { label: string; min: number }[] = [
  { label: "0–50", min: 0 },
  { label: "51–200", min: 51 },
  { label: "201–500", min: 201 },
  { label: "501–2000", min: 501 },
  { label: "2001–5000", min: 2001 },
  { label: "5001–10000", min: 5001 },
  { label: "10000+", min: 10000 },
];
