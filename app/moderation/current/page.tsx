import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * /moderation/current — server-side redirect to the moderator's currently
 * assigned item.
 *
 * - Assigned evidence        → /admin/moderation/evidence/<id>
 * - Assigned company request → /admin/moderation/company-requests/<id>
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

  const isModerator = await canModerate(userId);
  if (!isModerator) {
    redirect("/moderation");
  }

  const service = supabaseService();

  const [{ data: assignedEvidence }, { data: assignedRequest }] =
    await Promise.all([
      service
        .from("evidence")
        .select("id")
        .eq("assigned_moderator_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      service
        .from("company_requests")
        .select("id")
        .eq("assigned_moderator_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  if (assignedEvidence?.id) {
    redirect(`/admin/moderation/evidence/${assignedEvidence.id}`);
  }

  if (assignedRequest?.id) {
    redirect(`/admin/moderation/company-requests/${assignedRequest.id}`);
  }

  redirect("/moderation");
}
