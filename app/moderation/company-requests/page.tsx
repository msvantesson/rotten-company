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

