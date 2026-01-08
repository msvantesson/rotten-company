"use client";

import RottenIndexClient from "./RottenIndexClient";

export default function RottenIndexClientWrapper({
  initialCountry,
  initialOptions,
}: {
  initialCountry?: string | null;
  initialOptions?: { dbValue: string; label: string }[];
}) {
  return <RottenIndexClient initialCountry={initialCountry} initialOptions={initialOptions} />;
}
