import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import CompanyTabs from "@/components/CompanyTabs";
import SuggestEditForm from "./suggest-edit-form";

export const dynamic = "force-dynamic";

export default async function SuggestEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  const slug = resolved.slug;

  const supabase = await supabaseServer();

  // Require login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/company/${encodeURIComponent(slug)}/suggest-edit`);
  }

  // Load company by slug
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug, website, industry, description, country, size_employees")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !company) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header>
        <h1 className="text-3xl font-semibold">{company.name}</h1>
        <CompanyTabs slug={company.slug} />
      </header>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-1">Suggest an edit</h2>
        <p className="text-sm text-gray-500 mb-6">
          Propose corrections to the company profile. A moderator will review your suggestion before it goes live.
        </p>

        <SuggestEditForm
          companySlug={company.slug}
          currentValues={{
            website: company.website ?? "",
            industry: company.industry ?? "",
            description: company.description ?? "",
            country: company.country ?? "",
            size_employees: company.size_employees != null ? String(company.size_employees) : "",
          }}
        />
      </div>
    </div>
  );
}
