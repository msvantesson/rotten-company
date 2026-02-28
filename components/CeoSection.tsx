import { supabaseService } from "@/lib/supabase-service";
import CeoRequestForm from "@/components/CeoRequestForm";

type Props = {
  companyId: number;
  userId: string | null;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "?";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default async function CeoSection({ companyId, userId }: Props) {
  const service = supabaseService();

  // Check if the signed-in user is a moderator
  let isModerator = false;
  if (userId) {
    try {
      const { data: modRow } = await service
        .from("moderators")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      isModerator = !!modRow;
    } catch (e) {
      console.error("[CeoSection] Failed to check moderator status:", e);
    }
  }

  // Fetch CEO tenures for this company, joined with leader info
  type CeoTenure = {
    id: number;
    leader_id: number;
    started_at: string;
    ended_at: string | null;
    role: string | null;
    leaders: { id: number; name: string; slug: string } | null;
  };
  let currentCeo: CeoTenure | null = null;
  let pastCeos: CeoTenure[] = [];
  try {
    const { data: tenures, error: tenuresError } = await service
      .from("leader_tenures")
      .select("id, leader_id, started_at, ended_at, role, leaders(id, name, slug)")
      .eq("company_id", companyId)
      .eq("role", "ceo")
      .order("started_at", { ascending: false });

    if (tenuresError) {
      console.error("[CeoSection] Failed to fetch CEO tenures:", tenuresError.message);
    } else if (tenures) {
      const typed = tenures as unknown as CeoTenure[];
      currentCeo = typed.find((t) => !t.ended_at) ?? null;
      pastCeos = typed.filter((t) => !!t.ended_at);
    }
  } catch (e) {
    console.error("[CeoSection] Unexpected error fetching CEO tenures:", e);
  }

  // Check for pending leader_tenure_requests (for badge – only shown to moderators)
  let hasPendingRequests = false;
  if (isModerator) {
    try {
      const { count, error: countError } = await service
        .from("leader_tenure_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("role", "ceo")
        .eq("status", "pending");

      if (countError) {
        console.error("[CeoSection] Failed to count pending CEO requests:", countError.message);
      } else {
        hasPendingRequests = (count ?? 0) > 0;
      }
    } catch (e) {
      console.error("[CeoSection] Unexpected error checking pending CEO requests:", e);
    }
  }

  // If no CEO data at all and user is not a moderator, hide the section entirely
  if (!currentCeo && pastCeos.length === 0 && !isModerator) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">CEO</h2>
        {hasPendingRequests && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            Pending requests
          </span>
        )}
      </div>

      <div className="mt-3">
        {currentCeo ? (
          <div className="text-sm space-y-0.5">
            <p className="text-xs font-semibold text-neutral-500">Current CEO</p>
            <p>
              {currentCeo.leaders?.slug ? (
                <a
                  href={`/leader/${currentCeo.leaders.slug}`}
                  className="text-blue-700 hover:underline"
                >
                  {currentCeo.leaders.name ?? "Unknown"}
                </a>
              ) : (
                <span>{currentCeo.leaders?.name ?? "Unknown"}</span>
              )}
              <span className="text-neutral-500 ml-2">
                since {formatDate(currentCeo.started_at)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No current CEO on record.</p>
        )}
      </div>

      {pastCeos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-neutral-500 mb-1">Past CEOs</p>
          <ul className="space-y-1">
            {pastCeos.map((t) => (
              <li key={t.id} className="text-sm">
                {t.leaders?.slug ? (
                  <a
                    href={`/leader/${t.leaders.slug}`}
                    className="text-blue-700 hover:underline"
                  >
                    {t.leaders.name ?? "Unknown"}
                  </a>
                ) : (
                  <span>{t.leaders?.name ?? "Unknown"}</span>
                )}
                <span className="text-neutral-500 ml-2">
                  {formatDate(t.started_at)} – {formatDate(t.ended_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isModerator && (
        <CeoRequestForm
          companyId={companyId}
          currentTenureId={currentCeo?.id ?? null}
        />
      )}
    </section>
  );
}
