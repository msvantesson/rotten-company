import { supabaseServer } from "@/lib/supabase-server";

type CountryRow = {
  country?: string | null;
};

type ScoreRow = {
  company_id: number;
  rotten_score: number;
};

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  industry?: string | null;
  country?: string | null;
};

type IndexedCompany = {
  company_id: number;
  rotten_score: number;
  name: string;
  slug: string;
  industry?: string | null;
  country?: string | null;
};

// Small helper copies from page.tsx used only for debug output
const COUNTRY_NAME_MAP: Record<string, string> = {
  CH: "Switzerland",
  DE: "Germany",
  AT: "Austria",
  FR: "France",
  IT: "Italy",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  DK: "Denmark",
  IE: "Ireland",
};

function normalizeCountry(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (v.length === 0) return "";
  if (v.length === 2) {
    const code = v.toUpperCase();
    const mapped = COUNTRY_NAME_MAP[code];
    return (mapped ?? code).toUpperCase();
  }
  const foundEntry = Object.entries(COUNTRY_NAME_MAP).find(([, name]) => name.toLowerCase() === v.toLowerCase());
  if (foundEntry) return foundEntry[1].toUpperCase();
  return v.toUpperCase();
}

function getCountryDisplayName(value: string | null | undefined): string {
  if (!value) return "All countries";
  const v = value.trim();
  if (v.length === 0) return "All countries";
  if (v.length === 2) return COUNTRY_NAME_MAP[v.toUpperCase()] ?? v.toUpperCase();
  const found = Object.values(COUNTRY_NAME_MAP).find((n) => n.toLowerCase() === v.toLowerCase());
  if (found) return found;
  return v
    .split(/[^a-zA-Z]+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryCountry = url.searchParams.get("country");

  const supabase = await supabaseServer();

  // load countries
  const { data: countryRows } = await supabase.from("companies").select("country");
  const countrySet = new Set<string>();
  if (countryRows) {
    for (const row of countryRows) {
      const code = (row as CountryRow).country;
      if (code && code.trim().length > 0) countrySet.add(code.trim());
    }
  }

  const countryOptions = Array.from(countrySet).map((dbValue) => ({
    dbValue,
    norm: normalizeCountry(dbValue),
    label: getCountryDisplayName(dbValue),
  })).sort((a,b) => a.label.localeCompare(b.label));

  // build selected values
  let selectedDbValue = "";
  let selectedNormalized = "";
  if (queryCountry) {
    const targetNorm = normalizeCountry(queryCountry);
    const match = countryOptions.find((opt) => opt.norm === targetNorm);
    if (match) {
      selectedDbValue = match.dbValue;
      selectedNormalized = match.norm;
    } else {
      selectedDbValue = queryCountry;
      selectedNormalized = normalizeCountry(queryCountry);
    }
  }

  // load scores and companies similar to page
  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  const companyIds = (scoreRows || []).map((r: ScoreRow) => r.company_id);
  const { data: companyRows } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  const companyById = (companyRows || []).reduce((acc: Record<number, CompanyRow>, row: CompanyRow) => {
    acc[row.id] = row; return acc;
  }, {});

  const companies = (scoreRows || [])
    .map((row: ScoreRow) => {
      const c = companyById[row.company_id];
      if (!c) return null;
      return {
        company_id: row.company_id,
        rotten_score: row.rotten_score ?? 0,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        country: c.country,
      };
    })
    .filter((c: IndexedCompany | null): c is IndexedCompany => c !== null);

  const filtered = queryCountry ? companies.filter((c: IndexedCompany) => normalizeCountry(c.country) === selectedNormalized) : companies;

  const debug = {
    queryCountry,
    selectedDbValue,
    selectedNormalized,
    countryOptions,
    companiesSample: companies.slice(0, 200).map((c: IndexedCompany) => ({ id: c.company_id, name: c.name, country: c.country })),
    filteredCount: filtered.length,
  };

  return new Response(JSON.stringify(debug, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
