/**
 * Pure helper for building a company edit patch.
 *
 * Rules:
 *  - Only allow the whitelisted fields (website, industry, description, country, size_employees, name).
 *  - No-clearing rule: blank/empty inputs are treated as "no change".
 *  - size_employees: optional; if provided must be an integer >= 0.
 *  - name: if provided must be at least 2 characters after trimming.
 */

export const EDITABLE_COMPANY_FIELDS = [
  "name",
  "website",
  "industry",
  "description",
  "country",
  "size_employees",
] as const;

export type EditableField = (typeof EDITABLE_COMPANY_FIELDS)[number];

export type CompanyEditInput = Partial<Record<EditableField, string | number | null | undefined>>;

export type CompanyPatch = {
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  country?: string;
  size_employees?: number;
};

/**
 * Build a patch object containing only the fields that have a non-empty proposed value.
 * Empty strings and null/undefined inputs are treated as "no change" (no-clearing rule).
 */
export function buildCompanyEditPatch(proposed: CompanyEditInput): CompanyPatch {
  const patch: CompanyPatch = {};

  const textFields = ["name", "website", "industry", "description", "country"] as const;
  for (const field of textFields) {
    const val = proposed[field];
    if (typeof val === "string" && val.trim() !== "") {
      // name requires at least 2 characters
      if (field === "name" && val.trim().length < 2) continue;
      (patch as Record<string, unknown>)[field] = val.trim();
    }
  }

  // size_employees: parse to integer, must be >= 0
  const rawSize = proposed["size_employees"];
  if (rawSize !== null && rawSize !== undefined && rawSize !== "") {
    const parsed =
      typeof rawSize === "number" ? rawSize : parseInt(String(rawSize), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      patch.size_employees = parsed;
    }
  }

  return patch;
}

/**
 * Returns true if the patch has at least one field to apply.
 */
export function isPatchNonEmpty(patch: CompanyPatch): boolean {
  return Object.keys(patch).length > 0;
}
