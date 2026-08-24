const COMPANY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

type MinimalCompanyRow = {
  id: number;
  slug: string;
};

type CompanySlugRedirectRow = {
  company_id: number;
  old_slug: string;
  new_slug: string;
};

export type CompanySlugResolution =
  | { kind: "canonical"; companyId: number; canonicalSlug: string }
  | { kind: "redirect"; companyId: number; canonicalSlug: string }
  | { kind: "not_found" };

export type CompanySlugAvailability =
  | { available: true; slug: string }
  | {
      available: false;
      slug: string;
      conflict: "current" | "historical" | "invalid";
      message: string;
    };

function normalizeCompanySlug(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim();
  if (!normalized || !COMPANY_SLUG_PATTERN.test(normalized)) return null;
  return normalized;
}

function isMinimalCompanyRow(value: unknown): value is MinimalCompanyRow {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as MinimalCompanyRow).id === "number" &&
    normalizeCompanySlug((value as MinimalCompanyRow).slug) !== null
  );
}

function isCompanySlugRedirectRow(value: unknown): value is CompanySlugRedirectRow {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as CompanySlugRedirectRow).company_id === "number" &&
    normalizeCompanySlug((value as CompanySlugRedirectRow).old_slug) !== null &&
    normalizeCompanySlug((value as CompanySlugRedirectRow).new_slug) !== null
  );
}

export async function resolveCompanySlug(
  supabase: SupabaseLikeClient,
  requestedSlug: string,
): Promise<CompanySlugResolution> {
  const normalizedRequestedSlug = normalizeCompanySlug(requestedSlug);
  if (!normalizedRequestedSlug) {
    return { kind: "not_found" };
  }

  const { data: canonicalCompany } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("slug", normalizedRequestedSlug)
    .maybeSingle();

  if (isMinimalCompanyRow(canonicalCompany)) {
    return {
      kind: "canonical",
      companyId: canonicalCompany.id,
      canonicalSlug: canonicalCompany.slug,
    };
  }

  const { data: redirectRow } = await supabase
    .from("company_slug_redirects")
    .select("company_id, old_slug, new_slug")
    .eq("old_slug", normalizedRequestedSlug)
    .maybeSingle();

  if (!isCompanySlugRedirectRow(redirectRow)) {
    return { kind: "not_found" };
  }

  const oldSlug = normalizeCompanySlug(redirectRow.old_slug);
  const newSlug = normalizeCompanySlug(redirectRow.new_slug);
  if (!oldSlug || !newSlug || oldSlug !== normalizedRequestedSlug || oldSlug === newSlug) {
    return { kind: "not_found" };
  }

  const { data: redirectedCompany } = await supabase
    .from("companies")
    .select("id, slug")
    .eq("id", redirectRow.company_id)
    .maybeSingle();

  if (!isMinimalCompanyRow(redirectedCompany)) {
    return { kind: "not_found" };
  }

  if (redirectedCompany.slug === normalizedRequestedSlug) {
    return { kind: "not_found" };
  }

  return {
    kind: "redirect",
    companyId: redirectedCompany.id,
    canonicalSlug: redirectedCompany.slug,
  };
}

export async function ensureCompanySlugAvailable(
  supabase: SupabaseLikeClient,
  proposedSlug: string,
): Promise<CompanySlugAvailability> {
  const normalizedSlug = normalizeCompanySlug(proposedSlug);

  if (!normalizedSlug) {
    return {
      available: false,
      slug: typeof proposedSlug === "string" ? proposedSlug.trim() : "",
      conflict: "invalid",
      message:
        "The proposed company slug is invalid. Use lowercase letters, numbers, and single hyphens only.",
    };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (company) {
    return {
      available: false,
      slug: normalizedSlug,
      conflict: "current",
      message: `The proposed company slug "${normalizedSlug}" is already used by an existing company.`,
    };
  }

  const { data: redirectRow } = await supabase
    .from("company_slug_redirects")
    .select("company_id")
    .eq("old_slug", normalizedSlug)
    .maybeSingle();

  if (redirectRow) {
    return {
      available: false,
      slug: normalizedSlug,
      conflict: "historical",
      message: `The proposed company slug "${normalizedSlug}" is reserved by a historical company URL redirect.`,
    };
  }

  return { available: true, slug: normalizedSlug };
}
