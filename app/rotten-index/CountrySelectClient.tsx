"use client";

import React from "react";

type Option = { dbValue: string; label: string };

export default function CountrySelectClient({
  id,
  name,
  value,
  options,
}: {
  id?: string;
  name: string;
  value?: string | null;
  options: Option[];
}) {
  // value er den server‑leverede valgte værdi; brug den som controlled value
  const selectedValue = value || "";

  return (
    <select
      id={id}
      name={name}
      value={selectedValue}
      onChange={(e) => {
        const selected = e.target.value || "";
        const encoded = encodeURIComponent(selected);
        // Tilføj et timestamp for at undgå edge/HTTP cache returning en gammel side
        const ts = Date.now();
        const url = selected ? `/rotten-index?country=${encoded}&_ts=${ts}` : `/rotten-index?_ts=${ts}`;
        // Force fuld navigation så serveren får query param og genrender
        window.location.href = url;
      }}
      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
    >
      <option value="">All countries</option>
      {options.map((opt) => (
        <option key={opt.dbValue} value={opt.dbValue}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
