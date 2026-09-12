import { cache } from "react";
import { getLeaderData } from "@/lib/getLeaderData";
import { supabaseServer } from "@/lib/supabase-server";

export type LeaderRouteData = NonNullable<
  Awaited<ReturnType<typeof getLeaderData>>
>;

export const getLeaderRouteData = cache(
  async (requestedSlug: string): Promise<LeaderRouteData | null> => {
    const leaderData = await getLeaderData(requestedSlug);

    if (leaderData) {
      return leaderData;
    }

    const supabase = await supabaseServer();
    const { data: leader, error } = await supabase
      .from("leaders")
      .select("id")
      .eq("slug", requestedSlug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!leader) {
      return null;
    }

    throw new Error(
      `Leader detail lookup returned no data for existing leader slug "${requestedSlug}"`,
    );
  },
);
