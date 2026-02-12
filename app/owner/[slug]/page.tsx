import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const supabase = supabaseBrowser();

type Owner = {
  id: number;
  name: string | null;
  slug: string | null;
  country: string | null;
  rotten_score: number | null;
};

type CompanyRow = {
  id: number;
  name: string | null;
  slug: string | null;
  country: string | null;
  rotten_score: number | null;
};

export default async function OwnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const { data: owner, error: ownerError } = await supabase
    .from("owners_investors")
    .select("id, name, slug, country, rotten_score")
    .eq("slug", slug)
    .maybeSingle<Owner>();

  if (ownerError) {
    console.error("[owner page] error loading owner", slug, ownerError);
  }

  if (!owner) {
    console.warn("[owner page] no owner found for slug", slug);
    return notFound();
  }

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, slug, country, rotten_score")
    .eq("owner_investor_id", owner.id)
    .order("rotten_score", { ascending: false });

  if (companiesError) {
    console.error("[owner page] error loading companies", owner.id, companiesError);
  }

  const companyRows: CompanyRow[] = (companies ?? []) as any;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {owner.name ?? "Unknown owner"}
        </h1>
        <p className="text-sm text-gray-600">
          Country: {owner.country ?? "Unknown"}
        </p>
        {owner.rotten_score != null && (
          <p className="text-sm text-gray-700">
            Rotten Score:{" "}
            <span className="font-semibold">
              {Number(owner.rotten_score).toFixed(2)}
            </span>
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Portfolio companies</h2>

        {companyRows.length === 0 && (
          <p className="text-sm text-gray-600">
            No companies found for this owner in the Rotten Index.
          </p>
        )}

        {companyRows.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Country</th>
                <th className="py-2 text-right">Rotten Score</th>
              </tr>
            </thead>
            <tbody>
              {companyRows.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    {c.slug ? (
                      <Link
                        href={`/company/${c.slug}`}
                        className="text-blue-700 hover:underline"
                      >
                        {c.name ?? "Unknown company"}
                      </Link>
                    ) : (
                      c.name ?? "Unknown company"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {c.country ?? "Unknown"}
                  </td>
                  <td className="py-2 text-right">
                    {c.rotten_score != null
                      ? Number(c.rotten_score).toFixed(2)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
