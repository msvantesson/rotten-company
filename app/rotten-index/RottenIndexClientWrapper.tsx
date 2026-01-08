"use client";

import dynamic from "next/dynamic";

const RottenIndexClient = dynamic(() => import("./RottenIndexClient"), {
  ssr: false,
});

export default function RottenIndexClientWrapper({
  initialCountry,
  initialOptions,
}: {
  initialCountry?: string | null;
  initialOptions?: { dbValue: string; label: string }[];
}) {
  return <RottenIndexClient initialCountry={initialCountry} initialOptions={initialOptions} />;
}
