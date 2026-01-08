import React from "react";
import ClientCountrySync from "../../components/ClientCountrySync";

type Item = { id?: string | number; country?: string | null; [key: string]: any };

async function getData(): Promise<Item[]> {
  // Try to fetch data from an API route or external source.
  // Keep this robust: if fetching fails, return an empty array.
  try {
    const url = process.env.ROTTEN_DATA_URL ?? "http://localhost:3000/api/rotten-data";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export default async function Page() {
  const data = await getData();

  // Exclude items with null/undefined country server-side so downstream
  // components never receive null-country items.
  const filtered = (data || []).filter((item) => item && item.country != null);

  return (
    <main>
      <h1>Rotten index</h1>
      <ClientCountrySync items={filtered} />
    </main>
  );
}
