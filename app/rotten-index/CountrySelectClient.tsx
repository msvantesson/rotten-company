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
  return (
    <select
      id={id}
      name={name}
      defaultValue={value || ""}
      onChange={(e) => {
        const selected = e.target.value || "";
        const encoded = encodeURIComponent(selected);
        const url = selected ? `/rotten-index?country=${encoded}` : `/rotten-index`;
        // Force a full page load so the server component receives the query param
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
