import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /moderation/company-requests now redirects to the generic moderation queue.
 * The generic queue (/moderation) handles both evidence and company-request
 * assignments via claim_next_moderation_item.
 */
export default function CompanyRequestsModerationPage() {
  redirect("/moderation");
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
    // "Company-level evidence" filter:
    // - entity_type = 'company'
    // - OR legacy rows: entity_type IS NULL but company_id is present
    const companyEvidenceFilter =
      "entity_type.eq.company,and(entity_type.is.null,company_id.not.is.null)";

    // Pending unassigned EVIDENCE requests (company-level evidence)
    const { count: pendingEvidence, error: pendingEvidenceErr } = await admin
      .from("evidence")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .or(companyEvidenceFilter)
      .is("assigned_moderator_id", null)
      // exclude self-submitted; include unknown submitters
      .or(`user_id.is.null,user_id.neq.${userId}`);

    if (pendingEvidenceErr) {
      logDebug(
        "moderation-evidence-requests",
        "evidence pending count error",
        pendingEvidenceErr,
      );
    }

    // Pending unassigned COMPANY_REQUESTS
    const { count: pendingCompanyRequests, error: pendingCompanyErr } = await admin
      .from("company_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      // exclude self-submitted; include unknown submitters
      .or(`user_id.is.null,user_id.neq.${userId}`);

    if (pendingCompanyErr) {
      logDebug(
        "moderation-evidence-requests",
        "company_requests pending count error",
        pendingCompanyErr,
      );
    }

    pendingCount = (pendingEvidence ?? 0) + (pendingCompanyRequests ?? 0);

    // Assigned pending EVIDENCE request for this moderator?
    const { data: existingAssignedEvidence, error: assignedEvidenceErr } =
      await admin
        .from("evidence")
        .select(
          "id, title, summary, status, created_at, user_id, company_id, evidence_type",
        )
        .eq("status", "pending")
        .or(companyEvidenceFilter)
        .eq("assigned_moderator_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

    if (assignedEvidenceErr) {
      logDebug(
        "moderation-evidence-requests",
        "evidence assigned lookup error",
        assignedEvidenceErr,
      );
    }

    assignedRequest =
      existingAssignedEvidence && existingAssignedEvidence.length > 0
        ? (existingAssignedEvidence[0] as EvidenceRequestRow)
        : null;

    // Assigned pending COMPANY_REQUEST for this moderator?
    const { data: existingAssignedCompanyReq, error: assignedCompanyReqErr } =
      await admin
        .from("company_requests")
        .select("id")
        .eq("status", "pending")
        .eq("assigned_moderator_id", userId)
        .limit(1);

    if (assignedCompanyReqErr) {
      logDebug(
        "moderation-evidence-requests",
        "company_requests assigned lookup error",
        assignedCompanyReqErr,
      );
    }

    const hasAssignedEvidence = !!assignedRequest;
    const hasAssignedCompanyRequest =
      Array.isArray(existingAssignedCompanyReq) &&
      existingAssignedCompanyReq.length > 0;

    // FIXED: Button disabled only if moderator has assigned evidence,
    // not if they have only assigned company_requests.
    // You can only request a new case if:
    // - you are a moderator
    // - the gate is unlocked
    // - you don't already have an assigned evidence (company_requests don't block)
    canRequestNewCase = gate.allowed && !hasAssignedEvidence;
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
