export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

export default async function CompanyPage({
  params,
}: {
  params: { slug: string };
}) {
  // ✅ Extract slug safely
  const rawSlug = params?.slug ? decodeURIComponent(params.slug) : "";

  // ✅ Debug logs
  console.log("COMPANY PAGE DEBUG — params:", params);
  console.log("COMPANY PAGE DEBUG — rawSlug:", rawSlug);

  // ✅ Fetch company using maybeSingle to avoid coercion errors
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", rawSlug)
    .maybeSingle();

  console.log("COMPANY PAGE DEBUG — company:", company);
  console.log("COMPANY PAGE DEBUG — companyError:", companyError);

  // ✅ If no company found, show fallback
  if (!company) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No company found</h1>
        <p>Slug: {rawSlug
