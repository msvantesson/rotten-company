import { redirect } from "next/navigation";

export default async function CompanyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const to = trimmedName
    ? `/submit-company?name=${encodeURIComponent(trimmedName)}`
    : "/submit-company";
  redirect(to);
}
