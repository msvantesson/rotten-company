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
      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
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
