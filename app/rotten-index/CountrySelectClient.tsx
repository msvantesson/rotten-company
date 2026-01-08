"use client";
import { useRouter } from "next/navigation";

export default function CountrySelect({ initial = "" }) {
  const router = useRouter();
  function onChange(e) {
    const val = e.target.value;
    const url = new URL(window.location.href);
    if (val) url.searchParams.set("country", val);
    else url.searchParams.delete("country");
    url.searchParams.set("_ts", Date.now().toString());
    router.push(url.pathname + url.search); // triggers a real navigation and server re-render
  }

  return (
    <select id="country" name="country" defaultValue={initial} onChange={onChange}
      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
      <option value="">All countries</option>
      <option value="Denmark">Denmark</option>
      <option value="Ireland">Ireland</option>
    </select>
  );
}
