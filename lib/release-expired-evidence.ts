import { createClient } from "@supabase/supabase-js";

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

/**
 * Releases evidence and company_requests assignments that are older than maxAgeMinutes.
 * Default: 8 hours (480 minutes).
 */
export async function releaseExpiredEvidenceAssignments(
  maxAgeMinutes = 60 * 8, // 8 hours
) {
  const admin = adminClient();

  const cutoff = new Date(
    Date.now() - maxAgeMinutes * 60 * 1000,
  ).toISOString();

  const { error: evidenceError } = await admin
    .from("evidence")
    .update({
      assigned_moderator_id: null,
      assigned_at: null,
    })
    .eq("status", "pending")
    .not("assigned_moderator_id", "is", null)
    .lt("assigned_at", cutoff);

  if (evidenceError) {
    console.error(
      "[moderation] releaseExpiredEvidenceAssignments (evidence) failed",
      evidenceError,
    );
  }

  const { error: requestError } = await admin
    .from("company_requests")
    .update({
      assigned_moderator_id: null,
      assigned_at: null,
    })
    .eq("status", "pending")
    .not("assigned_moderator_id", "is", null)
    .lt("assigned_at", cutoff);

  if (requestError) {
    console.error(
      "[moderation] releaseExpiredEvidenceAssignments (company_requests) failed",
      requestError,
    );
  }
}
