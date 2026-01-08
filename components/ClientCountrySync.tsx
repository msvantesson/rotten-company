"use client";

import React, { useEffect, useState } from "react";

type Item = { id?: string | number; country?: string | null; [key: string]: any };

export default function ClientCountrySync({ items }: { items: Item[] }) {
  // Keep selected country in local state and sync with localStorage
  const [country, setCountry] = useState<string | null>(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("country") : null;
      return stored ?? null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (country == null) {
        localStorage.removeItem("country");
      } else {
        localStorage.setItem("country", country);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [country]);

  // Hide items that have null/undefined country on the client as well
  const visibleItems = (items || []).filter((i) => i && i.country != null);

  // Build a sorted list of unique countries from visible items
  const countries = Array.from(new Set(visibleItems.map((i) => i.country))).filter(Boolean) as string[];

  return (
    <div>
      <label style={{ display: "block", marginBottom: 8 }}>
        Country:
        <select
          value={country ?? ""}
          onChange={(e) => setCountry(e.target.value || null)}
          style={{ marginLeft: 8 }}
        >
          <option value="">(none)</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <ul>
        {visibleItems.map((it) => (
          <li key={it.id ?? JSON.stringify(it)}>
            {it.country ? `${it.country} — ${JSON.stringify(it)}` : JSON.stringify(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}
