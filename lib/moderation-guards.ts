"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type ModerationGateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

/**
 * Service‑role Supabase client (bypasses RLS).
 * Used ONLY for moderation / counting.
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
    }
  );
}

/**
 * Authenticated user ID via Supabase SSR.
 * Uses Next.js 16 cookies() API (no adapters).
 */
async function getUserId(): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookies(),
    }
  );

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Earned participation moderation gate.
 *
 * Rules:
 * - 0 pending evidence → requirement satisfied
 * - 1 pending evidence → moderating it counts as full requirement
 * - ≥2 pending evidence → user must moderate 2 items
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

  // Count pending evidence
  const { count: pendingCount, error: pendingError } = await admin
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (pendingError) {
    // Fail closed
    return {
      pendingEvidence: 0,
      requiredModerations: 2,
      userModerations: 0,
      allowed: false,
    };
  }

  const pendingEvidence = pendingCount ?? 0;

  let requiredModerations = 0;
  if (pendingEvidence === 1) requiredModerations = 1;
  if (pendingEvidence >= 2) requiredModerations = 2;

  // Count user's moderation votes
  const { count: userModerationCount, error: modError } = await admin
    .from("moderation_votes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (modError) {
    return {
      pendingEvidence,
      requiredModerations,
      userModerations: 0,
      allowed: false,
    };
  }

  const userModerations = userModerationCount ?? 0;

  return {
    pendingEvidence,
    requiredModerations,
    userModerations,
    allowed: userModerations >= requiredModerations,
  };
}

/**
 * Enforce moderation gate inside server actions.
 * Redirects to /moderation when blocked.
 */
export async function enforceModerationGate(nextPath: string) {
  const status = await getModerationGateStatus();

  if (!status.allowed) {
    redirect(
      `/moderation?next=${encodeURIComponent(nextPath)}`
    );
  }
}

/**
 * Annual scoring limit (distinct companies per calendar year).
 * Uses ratings.user_id + ratings.company_id.
 */
export async function enforceAnnualScoringLimit(
  limitPerYear: number
) {
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  const admin = adminClient();

  const startOfYear = new Date(
    Date.UTC(new Date().getUTCFullYear(), 0, 1)
  ).toISOString();

  const { data, error } = await admin
    .from("ratings")
    .select("company_id")
    .eq("user_id", userId)
    .gte("created_at", startOfYear);

  if (error) {
    throw new Error("Failed to evaluate scoring limit");
  }

  const distinctCompanies = new Set(
    (data ?? []).map((r) => r.company_id)
  ).size;

  if (distinctCompanies >= limitPerYear) {
    throw new Error("Annual scoring limit reached");
  }
}
