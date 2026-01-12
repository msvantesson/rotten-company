export default async function CompanySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;

  console.log("✅ [slug]/layout.tsx received params:", resolved);

  return <>{children}</>;
}
