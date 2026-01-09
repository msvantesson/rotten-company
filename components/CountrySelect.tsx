"use client";

import { useState } from "react";

export default function CountrySelect({
  options,
  initialValue,
}: {
  options: { dbValue: string; label: string }[];
  initialValue: string | null;
}) {
  // Use a derived initial value pattern
  const [value, setValue] = useState(() => initialValue ?? "");
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);

  // Handle prop changes (derived state pattern)
  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setValue(initialValue ?? "");
  }

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
