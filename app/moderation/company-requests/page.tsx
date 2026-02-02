import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";
import CompanyRequestsClient from "./requests-client";

export const dynamic = "force-dynamic";

export default async function CompanyRequestsModerationPage() {
  const supabase = supabaseService();

  logDebug("moderation-company-requests", "Loading");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;

  const { data: moderator } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  const isModerator = !!moderator;

  const { data, error } = await supabase
    .from("company_requests")
    .select("id, name, why, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logDebug("moderation-company-requests", "Query error", error);
  }

  return (
    <CompanyRequestsClient
      requests={data ?? []}
      isModerator={isModerator}
    />
  );
}
