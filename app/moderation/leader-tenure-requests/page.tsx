import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /moderation/leader-tenure-requests redirects to the generic moderation queue.
 */
export default function LeaderTenureRequestsModerationPage() {
  redirect("/moderation");
}
