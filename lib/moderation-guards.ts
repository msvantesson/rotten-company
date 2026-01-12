"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

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

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) =>
          cookieStore.set(name, value, options),
        remove: (name, options) =>
          cookieStore.delete({ name, ...options }),
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Earned participation gate
 */
export async function getModerationGateStatus(): Promise<GateStatus> {
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
  const { count: pendingEvidence } = await admin
    .from("evidence")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const pending = pendingEvidence ?? 0;

  // Determine required moderations
  let requiredModerations = 0;
  if (pending === 1) requiredModerations = 1;
  if (pending >= 2) requiredModerations = 2;

  // Count user's moderation votes
  const { count: userModerations } = await admin
    .from("moderation_votes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const userCount = userModerations ?? 0;

  return {
    pendingEvidence: pending,
    requiredModerations,
    userModerations: userCount,
    allowed: userCount >= requiredModerations,
  };
}

/**
 * Enforce gate inside server actions
 */
export async function enforceModerationGate(nextPath: string) {
  const status = await getModerationGateStatus();

  if (!status.allowed) {
    redirect(
      `/moderation?next=${encodeURIComponent(nextPath)}`
    );
  }
}
