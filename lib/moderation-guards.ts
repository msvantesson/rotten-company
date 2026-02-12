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

  const { count: pendingCount } = await admin
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const pendingEvidence = pendingCount ?? 0;

  let requiredModerations = 0;
  if (pendingEvidence === 1) requiredModerations = 1;
  if (pendingEvidence >= 2) requiredModerations = 2;

  const { count: userModerationCount } = await admin
    .from("moderation_votes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const userModerations = userModerationCount ?? 0;

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

  const { data: mod } = await admin
    .from("moderators")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

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
