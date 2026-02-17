"use server";

import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

type ModerationGateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

/**
 * Service‑role Supabase client (bypasses RLS).
 */
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
 * Authenticated user ID via Supabase SSR.
 * Used ONLY for participation gates.
 */
async function getUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Participation gate for submitters.
 * Users must moderate before they can submit companies or evaluations.
 *
 * Logic:
 * - Count all pending evidence.
 * - If 0 pending  → requiredModerations = 0
 * - If 1 pending  → requiredModerations = 1
 * - If >=2 pending → requiredModerations = 2
 *
 * - Count how many items this user has moderated:
 *   - moderation_events (evidence) with action IN ('approved','rejected')
 *   - moderation_actions (company_requests, etc.) with action IN ('approve','reject')
 * - allowed = userModerations >= requiredModerations
 */
export async function getModerationGateStatus(): Promise<ModerationGateStatus> {
  const userId = await getUserId();

  if (!userId) {
    return {
      pendingEvidence: 0,
      requiredModerations: 0,
      userModerations: 0,
      allowed: false,
    };
  }

  const admin = adminClient();

  // How many pending evidence items exist?
  const { count: pendingCount, error: pendingError } = await admin
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (pendingError) {
    console.error(
      "[moderation-guards] pending evidence count failed",
      pendingError,
    );
  }

  const pendingEvidence = pendingCount ?? 0;

  // Determine how many moderations are required.
  let requiredModerations = 0;
  if (pendingEvidence === 1) requiredModerations = 1;
  if (pendingEvidence >= 2) requiredModerations = 2;

  // How many items has this user actually moderated?
  // Count from both moderation_events (evidence) and moderation_actions (company_requests)
  // moderation_events: evidence approvals/rejections
  const { count: evidenceModerationCount, error: evidenceModerationError } = await admin
    .from("moderation_events")
    .select("id", { count: "exact", head: true })
    .eq("moderator_id", userId)
    .in("action", ["approved", "rejected"]);

  if (evidenceModerationError) {
    console.error(
      "[moderation-guards] evidence moderation count failed",
      evidenceModerationError,
    );
  }

  // moderation_actions: company_request and other approvals/rejections
  const { count: actionsModerationCount, error: actionsModerationError } = await admin
    .from("moderation_actions")
    .select("id", { count: "exact", head: true })
    .eq("moderator_id", userId)
    .in("action", ["approve", "reject"]);

  if (actionsModerationError) {
    console.error(
      "[moderation-guards] actions moderation count failed",
      actionsModerationError,
    );
  }

  const userModerations = (evidenceModerationCount ?? 0) + (actionsModerationCount ?? 0);

  return {
    pendingEvidence,
    requiredModerations,
    userModerations,
    allowed: userModerations >= requiredModerations,
  };
}

/**
 * Role‑based moderator access.
 * IMPORTANT: userId is passed explicitly.
 */
export async function canModerate(
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;

  const admin = adminClient();

  const { data: mod, error } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[moderation-guards] canModerate failed", error);
  }

  return !!mod;
}

/**
 * Participation gate for company submissions.
 */
export async function canSubmitCompany(): Promise<boolean> {
  const status = await getModerationGateStatus();
  return status.allowed;
}

/**
 * Participation gate for company evaluations.
 */
export async function canEvaluateCompany(): Promise<boolean> {
  const status = await getModerationGateStatus();
  return status.allowed;
}

/**
 * Participation gate for leader evaluations.
 */
export async function canEvaluateLeader(): Promise<boolean> {
  const status = await getModerationGateStatus();
  return status.allowed;
}
