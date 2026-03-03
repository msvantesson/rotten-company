import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SubmitCompanyForm from "./SubmitCompanyForm";

export default async function SubmitCompanyPage() {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const error = cookieStore.get("submit_company_error")?.value;

  return <SubmitCompanyForm userEmail={user.email!} error={error} />;
}
