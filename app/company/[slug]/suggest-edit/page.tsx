import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import CompanyTabs from "@/components/CompanyTabs";
import SuggestEditForm from "./suggest-edit-form";

export default async function SuggestEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  const slug = resolved.slug;

  const supabase = await supabaseServer();

  // Ensure user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Load company by slug
  const { data: company, error } = await supabase
    .from("companies")
    .select("name, slug, website, industry, description, country, size_employees, size_employees_range")
    .eq("slug", slug)
    .single();

  if (error || !company) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header>
        <h1 className="text-3xl font-semibold">{company.name}</h1>

        <CompanyTabs slug={company.slug} />
      </header>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Edit company</h2>
          <p className="text-sm text-gray-600 mt-1">
            Suggest corrections or updates to this company&apos;s information. Your suggestion will
            be reviewed by a moderator before any changes are applied.
          </p>
        </div>

        <SuggestEditForm
          companySlug={company.slug}
          currentValues={{
            website: company.website ?? "",
            industry: company.industry ?? "",
            description: company.description ?? "",
            country: company.country ?? "",
            size_employees: company.size_employees != null ? String(company.size_employees) : "",
            size_employees_range: company.size_employees_range ?? "",
          }}
        />
      </div>
    </div>
  );
}
