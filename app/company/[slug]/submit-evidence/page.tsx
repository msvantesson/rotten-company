import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { submitEvidence } from "./actions";

export default async function SubmitEvidencePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!company) notFound();

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
    </div>
  );
}
