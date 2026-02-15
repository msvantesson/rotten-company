import { supabaseServer } from "@/lib/supabase-server";
import { logDebug } from "@/lib/log";
import CompanyRequestsQueue from "./queue-client";
import { createClient } from "@supabase/supabase-js";
import { getModerationGateStatus } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";

type EvidenceRequestRow = {
  id: number;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
  company_id: number | null;
  evidence_type: string | null;
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

export default async function EvidenceRequestsModerationPage() {
  const supabase = await supabaseServer();

  logDebug("moderation-evidence-requests", "Loading");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logDebug("moderation-evidence-requests", "auth.getUser error", userError);
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
      "moderation-evidence-requests",
      "moderators lookup error",
      moderatorError,
    );
  }

  const isModerator = !!moderatorRow;

  // Evidence moderation gate status
  const gate = await getModerationGateStatus();

  // If not a moderator, do NOT expose any requests
  let assignedRequest: EvidenceRequestRow | null = null;
  let pendingCount = 0;
  let canRequestNewCase = false;

  if (isModerator && userId) {
    // Count pending "evidence requests":
    // - status = pending
    // - company-level evidence (entity_type = 'company')
    // - not yet assigned to any moderator
    // - not self-submitted (allow unknown submitters)
    const { count: pendingEvidence, error: pendingEvidenceErr } = await admin
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("entity_type", "company")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${userId}`);

    if (pendingEvidenceErr) {
      logDebug(
        "moderation-evidence-requests",
        "evidence pending count error",
        pendingEvidenceErr,
      );
    }

    // Count pending "company requests":
    // - status = pending
    // - not yet assigned to any moderator
    // - not self-submitted (allow unknown submitters)
    const { count: pendingCompanyRequests, error: pendingCompanyErr } = await admin
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .or(`user_id.is.null,user_id.neq.${userId}`);

    if (pendingCompanyErr) {
      logDebug(
        "moderation-evidence-requests",
        "company_requests pending count error",
        pendingCompanyErr,
      );
    }

    pendingCount = (pendingEvidence ?? 0) + (pendingCompanyRequests ?? 0);

    // Does this moderator already have an assigned pending evidence request?
    const { data: existingAssigned, error: assignedErr } = await admin
      .from("evidence")
      .select(
        "id, title, summary, status, created_at, user_id, company_id, evidence_type",
      )
      .eq("status", "pending")
      .eq("entity_type", "company")
      .eq("assigned_moderator_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (assignedErr) {
      logDebug(
        "moderation-evidence-requests",
        "evidence assigned lookup error",
        assignedErr,
      );
    }

    assignedRequest =
      existingAssigned && existingAssigned.length > 0
        ? (existingAssigned[0] as EvidenceRequestRow)
        : null;

    // You can only request a new case if:
    // - you are a moderator
    // - the gate is unlocked
    // - you don't already have an assigned case (evidence case)
    //
    // NOTE: We are still only checking assigned evidence here. If your RPC
    // assigns a company_request to a moderator, the redirect will take them to
    // /admin/moderation/company-requests/[id] (once implemented), but this page
    // currently won't detect that as "already assigned".
    // If you want strict 1-case-at-a-time across both kinds, we can add a check
    // for assigned company_requests too.
    canRequestNewCase = gate.allowed && !assignedRequest;
  }

  const debug: DebugInfo = {
    ssrUserPresent: !!user,
    ssrUserId: userId,
    isModerator,
  };

  return (
    <CompanyRequestsQueue
      assignedRequest={assignedRequest}
      debug={debug}
      gate={gate}
      pendingCompanyRequests={pendingCount}
      canRequestNewCase={canRequestNewCase}
    />
  );
}
