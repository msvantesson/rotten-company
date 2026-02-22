import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /moderation/evidence now redirects to the unified moderation queue.
 */
export default function ModerationEvidencePage() {
  redirect("/moderation");
}
