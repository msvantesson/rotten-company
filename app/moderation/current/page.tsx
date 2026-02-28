import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getAssignedModerationItems } from "@/lib/getAssignedModerationItems";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /moderation/current — server-side redirect to the moderator's currently
 * assigned item.
 *
 * - Assigned evidence        → /moderation/evidence/<id>
 * - Assigned company request → /moderation/company-requests/<id>
 * - Nothing assigned         → /moderation (Evidence queue)
 */
export default async function ModerationCurrentPage() {
  const userClient = await supabaseServer();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const userId = user?.id ?? null;

  if (!userId) {
    redirect(
      `/login?reason=moderate&message=${encodeURIComponent("You must be signed in to access moderation.")}`,
    );
  }

  const assignedItems = await getAssignedModerationItems(userId);
  const assignedEvidence = assignedItems.find((i) => i.kind === "evidence");
  const assignedRequest = assignedItems.find((i) => i.kind === "company_request");
  const assignedLeaderTenureRequest = assignedItems.find((i) => i.kind === "leader_tenure_request");

  if (assignedEvidence) {
    redirect(assignedEvidence.href);
  }

  if (assignedRequest) {
    redirect(assignedRequest.href);
  }

  if (assignedLeaderTenureRequest) {
    redirect(assignedLeaderTenureRequest.href);
  }

  redirect("/moderation");
}
