import { supabaseServer } from "@/lib/supabase-server";
import { logDebug } from "@/lib/log";
import CompanyRequestsQueue from "./queue-client";
import { createClient } from "@supabase/supabase-js";
import { getModerationGateStatus } from "@/lib/moderation-guards";

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
  assigned_moderator_id?: string | null;
  assigned_at?: string | null;
};

type DebugInfo = {
  ssrUserPresent: boolean;
  ssrUserId: string | null;
  isModerator: boolean;
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export default async function CompanyRequestsModerationPage() {
  const supabase = await supabaseServer();

  logDebug("moderation-company-requests", "Loading");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logDebug(
      "moderation-company-requests",
      "auth.getUser error",
      userError,
    );
  }

  const userId = user?.id ?? null;
  const admin = adminClient();

  const { data: moderatorRow, error: moderatorError } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (moderatorError) {
    logDebug(
      "moderation-company-requests",
      "moderators lookup error",
      moderatorError,
    );
  }

  const isModerator = !!moderatorRow;

  // Evidence moderation gate status
  const gate = await getModerationGateStatus();

  // If not a moderator, do NOT expose any requests
  let assignedRequest: CompanyRequestRow | null = null;
  let pendingCount = 0;

  if (isModerator && userId) {
    // Count only pending, *unassigned* company requests
    // that were NOT created by this moderator.
    const { count: pending, error: pendingErr } = await admin
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .neq("user_id", userId);

    if (pendingErr) {
      logDebug(
        "moderation-company-requests",
        "company_requests pending count error",
        pendingErr,
      );
    }

    pendingCount = pending ?? 0;

    // Find this moderator's assigned pending request (at most 1)
    const { data, error } = await admin
      .from("company_requests")
      .select(
        "id, name, why, status, created_at, country, website, description, user_id, assigned_moderator_id, assigned_at",
      )
      .eq("assigned_moderator_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      logDebug(
        "moderation-company-requests",
        "company_requests assigned query error",
        error,
      );
    } else if (data && data.length > 0) {
      assignedRequest = data[0] as CompanyRequestRow;
    }
  }

  const debug: DebugInfo = {
    ssrUserPresent: !!userId,
    ssrUserId: userId,
    isModerator,
  };

  const canRequestNewCase =
    isModerator && gate.allowed && !assignedRequest && pendingCount > 0;

  return (
    <CompanyRequestsQueue
      assignedRequest={assignedRequest}
      debug={debug}
      gate={{
        pendingEvidence: gate.pendingEvidence,
        requiredModerations: gate.requiredModerations,
        userModerations: gate.userModerations,
        allowed: gate.allowed,
      }}
      pendingCompanyRequests={pendingCount}
      canRequestNewCase={canRequestNewCase}
    />
  );
}
