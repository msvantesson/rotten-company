export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";
import { buildOwnerJsonLd } from "@/lib/jsonld-owner";
import { JsonLdDebugPanel } from "@/components/JsonLdDebugPanel";

type Params = Promise<{ slug: string }> | { slug: string };

export default async function OwnerPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string };
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  // 1. Fetch owner metadata
  const { data: owner } = await supabase
    .from("owners_investors")
    .select("id, name, type, slug, profile")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (!owner) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No owner/investor found</h1>
        <p>Slug: {rawSlug}</p>
      </div>
    );
  }

  // 2. Fetch portfolio companies
  const { data: rawPortfolio } = await supabase
    .from("owner_portfolio_view")
    .select("company:companies(name, slug)")
    .eq("owner_id", owner.id);

  // Normalize shape: company should be an object, not an array
  const portfolio =
    rawPortfolio?.map((p) => ({
      company: Array.isArray(p.company) ? p.company[0] : p.company,
    })) ?? [];

  // 3. Fetch ownership signals
  const { data: signals } = await supabase
    .from("ownership_signals_summary")
    .select("*")
    .eq("owner_slug", owner.slug)
    .order("severity", { ascending: false });

  // 4. Fetch breakdown (ratings, evidence, etc.)
  const { data: breakdown } = await supabase
    .from("owner_portfolio_breakdown")
    .select("*")
    .eq("owner_id", owner.id)
    .maybeSingle();

  // 5. Fetch destruction lever (optional)
  const { data: destructionLever } = await supabase
    .from("owner_destruction_lever")
    .select("avgDestructionLever:avg_destruction_lever")
    .eq("owner_id", owner.id)
    .maybeSingle();

  const avgDestructionLever = destructionLever?.avgDestructionLever ?? null;

  // 6. Build JSON-LD
  const jsonLd = buildOwnerJsonLd({
    owner,
    portfolio,
    breakdown,
    signals: signals ?? [],
    avgDestructionLever,
  });

  return (
    <>
      {/* JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      {/* Developer-only JSON-LD Debug Panel */}
      <JsonLdDebugPanel data={jsonLd} />

      <div style={{ padding: "2rem" }}>
        <h1>{owner.name}</h1>
        <p style={{ opacity: 0.8 }}>{owner.type}</p>

        {owner.profile && (
          <p style={{ marginTop: 8, opacity: 0.7 }}>{owner.profile}</p>
        )}

        {/* Portfolio */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Portfolio Companies</h2>

          {portfolio.length > 0 ? (
            <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
              {portfolio.map((p, i) => (
                <li
                  key={i}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <a
                    href={`/company/${p.company.slug}`}
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {p.company.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No portfolio companies found.</p>
          )}
        </section>

        {/* Ownership Signals */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Ownership Signals</h2>

          {signals?.length ? (
            <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
              {signals.map((s) => (
                <li
                  key={s.company_id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <a
                    href={`/company/${s.company_slug}`}
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {s.company_name}
                  </a>

                  <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>
                    Type: {s.signal_type} · Severity: {s.severity}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No ownership signals found.</p>
          )}
        </section>

        {/* Breakdown */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Portfolio Breakdown</h2>

          {breakdown ? (
            <pre style={{ background: "#fafafa", padding: "1rem" }}>
              {JSON.stringify(breakdown, null, 2)}
            </pre>
          ) : (
            <p>No breakdown data available.</p>
          )}
        </section>
      </div>
    </>
  );
}
