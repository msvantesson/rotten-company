import { headers } from "next/headers";
import Link from "next/link";
import { getSsrUser } from "@/lib/get-ssr-user";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate, getModerationGateStatus } from "@/lib/moderation-guards";
import ModerationClient from "./ModerationClient";
import { releaseExpiredEvidenceAssignments } from "@/lib/release-expired-evidence";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type ModerationItem = {
  id: string | number; // Can be integer (evidence) or UUID (company_request)
  title: string;
  created_at: string;
  assigned_moderator_id: string | null;
  user_id: string | null;
  item_type: "evidence" | "company_request"; // Track which table it's from
};

export default async function ModerationPage(props: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;
  if (isBuildTime) return null;

  // Check if auto-assignment should be skipped (e.g., after approving/rejecting a company request)
  const skipAutoAssign = props.searchParams?.skipAutoAssign === "true";

  // Release assignments older than 8 hours
  await releaseExpiredEvidenceAssignments(60 * 8);

  // Use defensive auth helper to prevent stale session errors
  const user = await getSsrUser();
  const moderatorId = user?.id ?? null;

  console.info(
    "[moderation] SSR user present:",
    !!user,
    "userId:",
    moderatorId,
    "skipAutoAssign:",
    skipAutoAssign,
  );

  if (!moderatorId) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p>You must be logged in to access moderation.</p>
        </section>
      </main>
    );
  }

  const allowedModerator = await canModerate(moderatorId);
  if (!allowedModerator) {
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p>You do not have moderator access.</p>
        </section>
      </main>
    );
  }

  const gate = await getModerationGateStatus();
  const service = supabaseService();

  // Fetch assigned evidence
  const { data: evidenceQueue, error: evidenceError } = await service
    .from("evidence")
    .select("id, title, created_at, assigned_moderator_id, user_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  // Fetch assigned company_requests
  const { data: companyQueue, error: companyError } = await service
    .from("company_requests")
    .select("id, name, created_at, assigned_moderator_id, user_id")
    .eq("assigned_moderator_id", moderatorId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (evidenceError || companyError) {
    console.error("[moderation] fetch failed", { evidenceError, companyError });
    return (
      <main className="max-w-3xl mx-auto py-8 space-y-6">
        <section>
          <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>
          <p className="text-red-600">Failed to load moderation queue.</p>
        </section>
      </main>
    );
  }

  // Combine both types into a unified queue
  let assignedItems: ModerationItem[] = [];

  if (evidenceQueue && evidenceQueue.length > 0) {
    assignedItems.push({
      ...evidenceQueue[0],
      item_type: "evidence",
    });
  }

  if (companyQueue && companyQueue.length > 0) {
    assignedItems.push({
      id: companyQueue[0].id,
      title: companyQueue[0].name, // company_requests use "name" instead of "title"
      created_at: companyQueue[0].created_at,
      assigned_moderator_id: companyQueue[0].assigned_moderator_id,
      user_id: companyQueue[0].user_id,
      item_type: "company_request",
    });
  }

  // Sort by creation date and take the oldest one
  assignedItems.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const assignedItem = assignedItems.length > 0 ? [assignedItems[0]] : [];

  // === AUTO-ASSIGNMENT ===
  // If the moderator has no assigned items and they haven't yet
  // completed the required moderations, automatically assign them up to
  // (requiredModerations - userModerations) items from unassigned pending evidence OR company_requests.
  // Skip auto-assignment if explicitly disabled (e.g., after completing a moderation action)
  try {
    const userModerations = gate.userModerations ?? 0;
    const requiredModerations = gate.requiredModerations ?? 0;

    const needs = Math.max(0, requiredModerations - userModerations);
    const hasAssigned = assignedItem.length > 0;

    if (!skipAutoAssign && !hasAssigned && needs > 0) {
      // Select oldest unassigned pending evidence not submitted by this moderator
      const { data: evidenceCandidates, error: evidenceCandErr } = await service
        .from("evidence")
        .select("id")
        .eq("status", "pending")
        .is("assigned_moderator_id", null)
        .or(`user_id.is.null,user_id.neq.${moderatorId}`)
        .order("created_at", { ascending: true })
        .limit(needs);

      // Select oldest unassigned pending company_requests not submitted by this moderator
      const { data: companyCandidates, error: companyCandErr } = await service
        .from("company_requests")
        .select("id, created_at")
        .eq("status", "pending")
        .is("assigned_moderator_id", null)
        .or(`user_id.is.null,user_id.neq.${moderatorId}`)
        .order("created_at", { ascending: true })
        .limit(needs);

      if (evidenceCandErr) {
        console.error("[moderation] evidence candidate lookup failed", evidenceCandErr);
      }
      if (companyCandErr) {
        console.error("[moderation] company candidate lookup failed", companyCandErr);
      }

      // Combine candidates and take oldest
      const allCandidates: Array<{ id: string | number; created_at: string; type: "evidence" | "company_request" }> = [];
      
      if (evidenceCandidates && evidenceCandidates.length > 0) {
        allCandidates.push(...evidenceCandidates.map((c: any) => ({ 
          id: c.id, 
          created_at: c.created_at || new Date().toISOString(),
          type: "evidence" as const 
        })));
      }
      
      if (companyCandidates && companyCandidates.length > 0) {
        allCandidates.push(...companyCandidates.map((c: any) => ({ 
          id: c.id, 
          created_at: c.created_at,
          type: "company_request" as const 
        })));
      }

      // Sort by created_at and take first one
      allCandidates.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const candidateToAssign = allCandidates[0];

      if (candidateToAssign) {
        const table = candidateToAssign.type === "evidence" ? "evidence" : "company_requests";
        
        // Claim it — update will only affect row if still unassigned
        const { error: updErr } = await service
          .from(table)
          .update({
            assigned_moderator_id: moderatorId,
            assigned_at: new Date().toISOString(),
          })
          .eq("id", candidateToAssign.id)
          .is("assigned_moderator_id", null);

        if (updErr) {
          console.error(`[moderation] auto-assign ${table} update failed`, updErr);
        } else {
          // Re-fetch to show the newly claimed item
          if (candidateToAssign.type === "evidence") {
            const { data: newQueue } = await service
              .from("evidence")
              .select("id, title, created_at, assigned_moderator_id, user_id")
              .eq("assigned_moderator_id", moderatorId)
              .eq("status", "pending")
              .order("created_at", { ascending: true })
              .limit(1);

            if (newQueue && newQueue.length > 0) {
              assignedItem[0] = {
                ...newQueue[0],
                item_type: "evidence",
              };
            }
          } else {
            const { data: newQueue } = await service
              .from("company_requests")
              .select("id, name, created_at, assigned_moderator_id, user_id")
              .eq("assigned_moderator_id", moderatorId)
              .eq("status", "pending")
              .order("created_at", { ascending: true })
              .limit(1);

            if (newQueue && newQueue.length > 0) {
              assignedItem[0] = {
                id: newQueue[0].id,
                title: newQueue[0].name,
                created_at: newQueue[0].created_at,
                assigned_moderator_id: newQueue[0].assigned_moderator_id,
                user_id: newQueue[0].user_id,
                item_type: "company_request",
              };
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("[moderation] auto-assign exception", e);
  }

  // Count pending available items (both evidence and company_requests)
  const { count: pendingEvidence, error: pendingEvidenceErr } = await service
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("assigned_moderator_id", null)
    .or(`user_id.is.null,user_id.neq.${moderatorId}`);

  const { count: pendingCompanyRequests, error: pendingCompanyErr } = await service
    .from("company_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("assigned_moderator_id", null)
    .or(`user_id.is.null,user_id.neq.${moderatorId}`);

  if (pendingEvidenceErr) {
    console.error("[moderation] pending available evidence count failed", pendingEvidenceErr);
  }
  if (pendingCompanyErr) {
    console.error("[moderation] pending available company_requests count failed", pendingCompanyErr);
  }

  const pendingCount = (pendingEvidence ?? 0) + (pendingCompanyRequests ?? 0);

  const canRequestNewCase = true;

  return (
    <main className="max-w-3xl mx-auto py-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-4">Moderation queue</h1>

        <ModerationClient
          items={assignedItem}
          moderatorId={moderatorId}
          gate={gate}
          pendingAvailable={pendingCount}
          canRequestNewCase={canRequestNewCase}
        />
      </section>

      <hr />

      <section>
        <h2 className="text-xl font-semibold">
          Extra: Evidence requests moderation
        </h2>
        <p className="text-sm text-neutral-600">
          After you've worked through the main moderation queue, you can
          optionally help with extra evidence items in the{" "}
          <Link
            href="/moderation/company-requests"
            className="text-blue-700 hover:underline"
          >
            Evidence requests moderation
          </Link>{" "}
          view.
        </p>

        <p className="mt-4 text-xs text-neutral-500">
          That page shows pending, unassigned evidence submissions as optional
          extra work. Decisions are still made in the main moderation queue.
        </p>
      </section>
    </main>
  );
}
