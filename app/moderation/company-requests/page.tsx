import { supabaseServer } from "@/lib/supabase-server";
import { logDebug } from "@/lib/log";
import CompanyRequestsQueue from "./queue-client";

export const dynamic = "force-dynamic";

type CompanyRequestRow = {
  id: string;
  name: string;
  why: string | null;
  status: string;
  created_at: string;
  country: string | null;
  website: string | null;
  description: string | null;
  user_id: string | null;
};

export default async function CompanyRequestsModerationPage() {
  const supabase = await supabaseServer();

  logDebug("moderation-company-requests", "Loading");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logDebug("moderation-company-requests", "auth.getUser error", userError);
  }

  const userId = user?.id ?? null;

  const { data: moderatorRow, error: moderatorError } = await supabase
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (moderatorError) {
    logDebug("moderation-company-requests", "moderators lookup error", moderatorError);
  }

  const isModerator = !!moderatorRow;

  const { data, error } = await supabase
    .from("company_requests")
    .select("id, name, why, status, created_at, country, website, description, user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    logDebug("moderation-company-requests", "company_requests query error", error);
  }

  const requests = (data ?? []) as CompanyRequestRow[];

  return (
    <CompanyRequestsQueue
      initialRequests={requests}
      debug={{
        ssrUserPresent: !!userId,
        ssrUserId: userId,
        isModerator,
      }}
    />
  );
}
