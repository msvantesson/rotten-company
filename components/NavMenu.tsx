import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import NavMenuClient from "./NavMenuClient";

export default async function NavMenu() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[NavMenu] supabaseServer.auth.getUser error", error);
  }

  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  let isModerator = false;
  let moderationHref = "/moderation";

  if (userId) {
    const { data: modRow, error: modError } = await supabase
      .from("moderators")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (modError) {
      console.error("[NavMenu] moderators lookup error", modError);
    }

    isModerator = !!modRow;

    if (isModerator) {
      // Resolve the "Moderation" link to the assigned item page (if any)
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
        moderationHref = `/admin/moderation/evidence/${assignedEvidence.id}`;
      } else if (assignedRequest?.id) {
        moderationHref = `/admin/moderation/company-requests/${assignedRequest.id}`;
      }
    }
  }

  return (
    <NavMenuClient
      email={email}
      isModerator={isModerator}
      moderationHref={moderationHref}
    />
  );
}
