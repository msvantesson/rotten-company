import { cache } from "react";
import { supabaseServer } from "@/lib/supabase-server";

export type EvidencePageData = {
  evidence: {
    id: number;
    title: string;
    summary: string | null;
  };
  company: {
    name: string;
    slug: string;
  };
};

export const getEvidencePageData = cache(
  async (id: number): Promise<EvidencePageData | null> => {
    if (!Number.isSafeInteger(id) || id <= 0) return null;

    const supabase = await supabaseServer();
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidence")
      .select("id, title, summary, company_id, entity_type, entity_id")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();

    if (evidenceError) throw evidenceError;
    if (!evidence) return null;

    const companyId =
      typeof evidence.company_id === "number"
        ? evidence.company_id
        : evidence.entity_type === "company" && typeof evidence.entity_id === "number"
          ? evidence.entity_id
          : null;
    if (companyId === null) return null;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, slug")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) throw companyError;
    if (
      !company ||
      typeof company.name !== "string" ||
      typeof company.slug !== "string" ||
      !company.slug.trim()
    ) {
      return null;
    }

    const title = typeof evidence.title === "string" ? evidence.title.trim() : "";
    if (!title) return null;

    return {
      evidence: {
        id: evidence.id,
        title,
        summary: typeof evidence.summary === "string" ? evidence.summary : null,
      },
      company: {
        name: company.name,
        slug: company.slug.trim(),
      },
    };
  },
);
