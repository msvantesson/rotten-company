"use client";

import { useEffect, useState } from "react";

export default function CountrySelect({
  options,
  initialValue,
}: {
  options: { dbValue: string; label: string }[];
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  return (
    <select
      id="country"
      name="country"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="border border-border rounded px-2 py-1 text-sm bg-surface text-foreground"
    >
      <option value="">All countries</option>
      {options.map((opt) => (
        <option key={opt.dbValue} value={opt.dbValue}>
          {opt.label} ({opt.dbValue})
        </option>
      ))}
    </select>
  );
}
