export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

type Params = Promise<{ slug: string }> | { slug: string };
type Evidence = { id: number; title: string; summary?: string };
type Owner = { id: number; name: string; type: string; slug: string } | null;

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

  // 2. Fetch ownership signals (companies influenced)
  const { data: signals } = await supabase
    .from("ownership_signals_summary")
    .select("*")
    .eq("owner_slug", owner.slug)
    .order("severity", { ascending: false });

  // 3. Fetch approved evidence
  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, summary")
    .eq("owner_id", owner.id)
    .eq("status", "approved");

  const companyCount = signals?.length ?? 0;

  // 4. JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: owner.name,
    url: `https://rotten-company.com/owner/${owner.slug}`,
    description: owner.profile ?? `Ownership profile for ${owner.name}.`,

    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "companyCount",
        value: companyCount,
      },
    ],

    hasPart:
      signals?.map((s) => ({
        "@type": "Organization",
        name: s.company_name,
        url: `https://rotten-company.com/company/${s.company_slug}`,
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "signalType",
            value: s.signal_type,
          },
          {
            "@type": "PropertyValue",
            name: "severity",
            value: s.severity,
          },
        ],
      })) ?? [],
  };

  return (
    <>
      {/* JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      <div style={{ padding: "2rem" }}>
        <h1>{owner.name}</h1>
        <p style={{ opacity: 0.8 }}>{owner.type}</p>
        {owner.profile && (
          <p style={{ marginTop: 8, opacity: 0.7 }}>{owner.profile}</p>
        )}

        {/* Companies influenced */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Companies Influenced</h2>

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

        {/* Evidence */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Approved Evidence</h2>

          {evidence?.length ? (
            <ul>
              {evidence.map((item) => (
                <li key={item.id} style={{ marginBottom: "1rem" }}>
                  <strong>{item.title}</strong>
                  {item.summary && (
                    <div style={{ marginTop: 6 }}>{item.summary}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No approved evidence found.</p>
          )}
        </section>
      </div>
    </>
  );
}
