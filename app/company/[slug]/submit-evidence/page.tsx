import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { submitEvidence } from "./actions";

export default async function SubmitEvidencePage({
  params,
}: {
  params: { slug: string };
}) {
  console.log("[submit-evidence] route hit");
  console.log("[submit-evidence] raw params:", params);

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
    console.warn("[submit-evidence] no user found, redirecting to /login");
    redirect("/login");
  }

  console.log("[submit-evidence] user:", user.id);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (companyError) {
    console.error("[submit-evidence] company fetch error:", companyError.message);
  }

  if (!company) {
    console.warn("[submit-evidence] no company found for slug:", params.slug);
    notFound();
  }

  console.log("[submit-evidence] company resolved:", company.id, company.name);

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto" }}>
      <h1>Submit Evidence for {company.name}</h1>

      <form action={submitEvidence}>
        <input type="hidden" name="company_id" value={company.id} />
        <input type="hidden" name="company_slug" value={company.slug} />

        <div>
          <label>Title</label>
          <input name="title" required />
        </div>

        <div>
          <label>Summary</label>
          <textarea name="summary" rows={4} required />
        </div>

        <div>
          <label>Category</label>
          <select name="category_id" required>
            <option value="1">General</option>
            <option value="2">Labor</option>
            <option value="3">Environment</option>
            <option value="4">Governance</option>
            <option value="5">Ethics</option>
          </select>
        </div>

        <button type="submit">Submit Evidence</button>
      </form>

      {console.log("[submit-evidence] form rendered")}
    </div>
  );
}
