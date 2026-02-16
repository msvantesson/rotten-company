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
 * Releases evidence assignments that are older than maxAgeMinutes.
 * Default: 8 hours (480 minutes).
 */
export async function releaseExpiredEvidenceAssignments(
  maxAgeMinutes = 60 * 8, // 8 hours
) {
  const admin = adminClient();

  const cutoff = new Date(
    Date.now() - maxAgeMinutes * 60 * 1000,
  ).toISOString();

  const { error } = await admin
    .from("evidence")
    .update({
      assigned_moderator_id: null,
      assigned_at: null,
    })
    .eq("status", "pending")
    .not("assigned_moderator_id", "is", null)
    .lt("assigned_at", cutoff);

  if (error) {
    console.error(
      "[moderation] releaseExpiredEvidenceAssignments failed",
      error,
    );
  }

  // --- NEW: also release company_request assignments older than cutoff ---
  const { error: crErr } = await admin
    .from("company_requests")
    .update({ assigned_moderator_id: null, assigned_at: null })
    .eq("status", "pending")
    .not("assigned_moderator_id", "is", null)
    .lt("assigned_at", cutoff);

  if (crErr) {
    console.error("[moderation] releaseExpiredCompanyRequestAssignments failed", crErr);
  }
}
