"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { getModerationGateStatus } from "@/lib/moderation-guards";

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function enqueueLeaderTenureRequestNotification(
  service: ReturnType<typeof supabaseService>,
  userId: string | null,
  subject: string,
  body: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!userId) {
    console.warn("[enqueueLeaderTenureRequestNotification] no user_id, skipping");
    return;
  }

  const { data: userRow } = await service
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const email = userRow?.email ?? null;
  if (!email) {
    console.warn(`[enqueueLeaderTenureRequestNotification] no email for user ${userId}, skipping`);
    return;
  }

  const { error } = await service.from("notification_jobs").insert({
    recipient_email: email,
    subject,
    body,
    metadata,
    status: "pending",
  });

  if (error) {
    console.warn("[enqueueLeaderTenureRequestNotification] failed to enqueue:", error.message);
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Assign the next pending leader_tenure_request to the current moderator.
 * Falls back to /moderation if none available or on error.
 */
export async function assignNextLeaderTenureRequest() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(
      "/login?reason=moderate&message=" +
        encodeURIComponent("You must be signed in to moderate."),
    );
  }

  const service = supabaseService();

  // Gate check (Rule A): user must have completed required moderations
  const gate = await getModerationGateStatus();
  if (!gate.allowed) {
    console.warn("[assignNextLeaderTenureRequest] authorization failed", {
      userId,
      allowed: gate.allowed,
    });
    redirect("/moderation");
  }

  // Find next unassigned pending request, excluding own submissions
  const { data: nextRequest, error: findError } = await service
    .from("leader_tenure_requests")
    .select("id")
    .eq("status", "pending")
    .is("assigned_moderator_id", null)
    .or(`user_id.is.null,user_id.neq.${userId}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("[assignNextLeaderTenureRequest] query failed:", findError.message);
    redirect("/moderation");
  }

  if (!nextRequest) {
    redirect("/moderation");
  }

  // Optimistic assignment (only assign if still unassigned to avoid races)
  const { error: updateError } = await service
    .from("leader_tenure_requests")
    .update({
      assigned_moderator_id: userId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", nextRequest.id)
    .is("assigned_moderator_id", null);

  if (updateError) {
    console.error("[assignNextLeaderTenureRequest] update failed:", updateError.message);
    redirect("/moderation");
  }

  redirect(`/moderation/leader-tenure-requests/${nextRequest.id}`);
}

/**
 * Approve a leader_tenure_request assigned to the current moderator.
 * For 'add': resolves or creates the leader and inserts a leader_tenures row.
 * For 'end': updates ended_at on the target tenure.
 */
export async function approveLeaderTenureRequest(formData: FormData) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(
      "/login?reason=moderate&message=" +
        encodeURIComponent("You must be signed in."),
    );
  }

  const requestId = formData.get("request_id")?.toString() ?? "";
  if (!requestId) throw new Error("Missing request_id");

  const note = formData.get("moderator_note")?.toString() ?? "";
  const service = supabaseService();

  const { data: req, error: reqError } = await service
    .from("leader_tenure_requests")
    .select(
      "id, company_id, request_type, role, leader_name, linkedin_url, started_at, ended_at, target_tenure_id, user_id, status, assigned_moderator_id",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) {
    console.error("[approveLeaderTenureRequest] fetch failed:", reqError.message);
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to load request.")}`,
    );
  }

  if (!req) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Request not found.")}`,
    );
  }

  if (req.status !== "pending") {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("This request is no longer pending.")}`,
    );
  }

  if (req.assigned_moderator_id !== userId) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("This item is not assigned to you.")}`,
    );
  }

  // Prevent self-approval
  if (req.user_id === userId) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("You cannot approve your own request.")}`,
    );
  }

  if (req.request_type === "add") {
    const leaderName = req.leader_name?.trim() ?? "";
    if (!leaderName) {
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("leader_name is required for add requests.")}`,
      );
    }
    if (!req.started_at) {
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("started_at is required for add requests.")}`,
      );
    }

    // Resolve or create leader – prefer linkedin_url match if column exists, else name match
    let leaderId: number | null = null;

    if (req.linkedin_url) {
      // Attempt linkedin_url lookup (column may or may not exist in leaders table)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: byLinkedin } = await (service as any)
          .from("leaders")
          .select("id")
          .eq("linkedin_url", req.linkedin_url)
          .limit(1)
          .maybeSingle();
        if (byLinkedin) leaderId = (byLinkedin as { id: number }).id;
      } catch {
        // Column doesn't exist – fall through to name matching
      }
    }

    if (!leaderId) {
      const { data: byName } = await service
        .from("leaders")
        .select("id")
        .ilike("name", leaderName)
        .limit(1)
        .maybeSingle();
      if (byName) leaderId = byName.id;
    }

    if (!leaderId) {
      // Create a new leader
      const leaderSlug = slugify(leaderName);
      const { data: newLeader, error: leaderErr } = await service
        .from("leaders")
        .insert({ name: leaderName, slug: leaderSlug, role: "ceo" })
        .select("id")
        .single();

      if (leaderErr || !newLeader) {
        console.error("[approveLeaderTenureRequest] leader insert failed:", leaderErr?.message);
        redirect(
          `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to create leader.")}`,
        );
      }
      leaderId = newLeader?.id ?? null;
      if (!leaderId) {
        redirect(
          `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to create leader.")}`,
        );
      }
    }

    // Overlap check: if this is an open-ended (active) tenure, ensure no active CEO exists
    if (!req.ended_at) {
      const { data: activeCheck } = await service
        .from("leader_tenures")
        .select("id")
        .eq("company_id", req.company_id)
        .eq("role", "ceo")
        .is("ended_at", null)
        .maybeSingle();

      if (activeCheck) {
        redirect(
          `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("There is already an active CEO for this company. End the current tenure first.")}`,
        );
      }
    }

    // Insert leader_tenures row
    const { error: insertErr } = await service.from("leader_tenures").insert({
      leader_id: leaderId,
      company_id: req.company_id,
      role: req.role ?? "ceo",
      started_at: req.started_at,
      ended_at: req.ended_at ?? null,
    });

    if (insertErr) {
      // Unique constraint violation → friendly message
      if (insertErr.code === "23505") {
        redirect(
          `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("A CEO tenure already exists that conflicts with this request.")}`,
        );
      }
      console.error("[approveLeaderTenureRequest] tenure insert failed:", insertErr.message);
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to insert CEO tenure.")}`,
      );
    }
  } else if (req.request_type === "end") {
    if (!req.target_tenure_id) {
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("target_tenure_id is required for end requests.")}`,
      );
    }
    if (!req.ended_at) {
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("ended_at is required for end requests.")}`,
      );
    }

    const tenureId = req.target_tenure_id;
    const { error: updateErr } = await service
      .from("leader_tenures")
      .update({ ended_at: req.ended_at })
      .eq("id", tenureId)
      .is("ended_at", null);

    if (updateErr) {
      console.error("[approveLeaderTenureRequest] tenure update failed:", updateErr.message);
      redirect(
        `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to update CEO tenure.")}`,
      );
    }
  } else {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Unknown request_type.")}`,
    );
  }

  // Mark request approved
  await service
    .from("leader_tenure_requests")
    .update({
      status: "approved",
      moderator_id: userId,
      decision_reason: note || null,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  // Audit log
  await service.from("moderation_actions").insert({
    moderator_id: userId,
    target_type: "leader_tenure_request",
    target_id: requestId,
    action: "approve",
    moderator_note: note || null,
    source: "ui",
  });

  // Notification
  await enqueueLeaderTenureRequestNotification(
    service,
    req.user_id ?? null,
    "Your CEO tenure request was approved",
    [
      "Hi,",
      "",
      "Your CEO tenure request has been approved.",
      "",
      "— Rotten Company",
    ].join("\n"),
    { requestId, action: "approve" },
  );

  revalidatePath("/moderation");
  redirect("/moderation");
}

/**
 * Reject a leader_tenure_request assigned to the current moderator.
 * A rejection reason is required.
 */
export async function rejectLeaderTenureRequest(formData: FormData) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(
      "/login?reason=moderate&message=" +
        encodeURIComponent("You must be signed in."),
    );
  }

  const requestId = formData.get("request_id")?.toString() ?? "";
  if (!requestId) throw new Error("Missing request_id");

  const note = formData.get("moderator_note")?.toString() ?? "";
  if (!note.trim()) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Rejection reason is required.")}`,
    );
  }

  const service = supabaseService();

  const { data: req, error: reqError } = await service
    .from("leader_tenure_requests")
    .select("id, user_id, status, assigned_moderator_id")
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) {
    console.error("[rejectLeaderTenureRequest] fetch failed:", reqError.message);
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Failed to load request.")}`,
    );
  }

  if (!req) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("Request not found.")}`,
    );
  }

  if (req.status !== "pending") {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("This request is no longer pending.")}`,
    );
  }

  if (req.assigned_moderator_id !== userId) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("This item is not assigned to you.")}`,
    );
  }

  // Prevent self-rejection
  if (req.user_id === userId) {
    redirect(
      `/moderation/leader-tenure-requests/${requestId}?error=${encodeURIComponent("You cannot reject your own request.")}`,
    );
  }

  await service
    .from("leader_tenure_requests")
    .update({
      status: "rejected",
      moderator_id: userId,
      decision_reason: note,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  await service.from("moderation_actions").insert({
    moderator_id: userId,
    target_type: "leader_tenure_request",
    target_id: requestId,
    action: "reject",
    moderator_note: note,
    source: "ui",
  });

  await enqueueLeaderTenureRequestNotification(
    service,
    req.user_id ?? null,
    "Your CEO tenure request was rejected",
    [
      "Hi,",
      "",
      "Your CEO tenure request was rejected.",
      "",
      "Reason:",
      note,
      "",
      "— Rotten Company",
    ].join("\n"),
    { requestId, action: "reject" },
  );

  revalidatePath("/moderation");
  redirect("/moderation");
}
