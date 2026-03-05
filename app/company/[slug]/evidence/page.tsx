export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getEvidenceWithManagers } from "@/lib/getEvidenceWithManagers";
import EvidenceList from "@/components/EvidenceList";
import CompanyTabs from "@/components/CompanyTabs";

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = (await Promise.resolve(params)) as { slug?: string };
  const slug = resolvedParams?.slug;

  if (!slug) {
    return notFound();
  }

  const supabase = await supabaseServer();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (companyError) {
    console.error("Error loading company in evidence page:", slug, companyError);
  }

  if (!company) {
    return notFound();
  }

  let evidence: any[] = [];
  try {
    evidence = (await getEvidenceWithManagers(company.id)) ?? [];
  } catch (e) {
    console.error("Error loading evidence for company:", company.id, e);
    evidence = [];
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header>
        <h1 className="text-3xl font-semibold">{company.name}</h1>
        <CompanyTabs slug={company.slug} />
      </header>

      <section>
        <h2 className="text-lg font-semibold">Approved Evidence</h2>

        <div className="mt-6">
          <EvidenceList evidence={evidence} />
        </div>
      </section>
    </div>
  );
}
