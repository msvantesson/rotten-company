/**
 * Builds the fields to insert into `companies` when creating a new company row
 * from an approved `company_requests` row.
 *
 * Used by both approval paths:
 *   - app/api/moderation/company-requests/approve/route.ts  (API endpoint)
 *   - app/moderation/company-requests/actions.ts             (server action)
 */
export interface CompanyRequestFields {
  name: string;
  country?: string | null;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
  /** Numeric lower-bound of the employee range (e.g. 10000). Maps to company_requests.size_employees_min. */
  size_employees_min?: number | null;
  /** Human-readable label for the employee range (e.g. "10000+"). Maps to company_requests.size_employees. */
  size_employees?: string | null;
}

export function companyInsertFromRequest(
  cr: CompanyRequestFields,
  slug: string,
): Record<string, unknown> {
  const sizeEmployeesRange = cr.size_employees ? cr.size_employees.trim() || null : null;

  return {
    name: cr.name,
    slug,
    country: cr.country ?? null,
    website: cr.website ?? null,
    description: cr.description ?? null,
    industry: cr.industry ?? null,
    size_employees: cr.size_employees_min ?? null,
    size_employees_range: sizeEmployeesRange,
  };
}
