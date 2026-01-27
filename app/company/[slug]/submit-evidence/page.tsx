import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { submitEvidence } from "./actions";

export default async function SubmitEvidencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  console.log("[submit-evidence] route hit");

  const resolvedParams = await params;
  console.log("[submit-evidence] resolved params:", resolvedParams);

  const { slug } = resolvedParams;

  const supabase = await supabaseServer();
  console.log("[submit-evidence] supabaseServer initialized");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[submit-evidence] auth error:", authError.message);
  }

  if (!user) {
    console.warn("[submit-evidence] no user → redirect /login");
    redirect("/login");
  }

  console.log("[submit-evidence] authenticated user:", user.id);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (companyError) {
    console.error(
      "[submit-evidence] company lookup error:",
      companyError.message
    );
  }

  if (!company) {
    console.warn("[submit-evidence] no company found for slug:", slug);
    notFound();
  }

  console.log(
    "[submit-evidence] company resolved:",
    company.id,
    company.name
  );

  console.log("[submit-evidence] rendering form JSX");

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6">
        Submit Evidence for {company.name}
      </h1>

      <form action={submitEvidence} className="space-y-6">
        <input type="hidden" name="company_id" value={company.id} />
        <input type="hidden" name="company_slug" value={company.slug} />

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Summary</label>
          <textarea
            name="summary"
            rows={4}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            name="category_id"
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="1">General</option>
            <option value="2">Labor</option>
            <option value="3">Environment</option>
            <option value="4">Governance</option>
            <option value="5">Ethics</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Submit Evidence
        </button>
      </form>
    </div>
  );
}
