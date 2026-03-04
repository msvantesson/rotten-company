import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SubmitCompanyForm from "./SubmitCompanyForm";

export default async function SubmitCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const error = cookieStore.get("submit_company_error")?.value;
  const { name } = await searchParams;
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const prefillName = trimmedName || undefined;

  return <SubmitCompanyForm userEmail={user.email!} error={error} prefillName={prefillName} />;
}
