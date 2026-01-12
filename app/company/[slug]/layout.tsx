export default async function CompanySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;

  console.log("CompanySlugLayout params:", resolved);

  return <>{children}</>;
}
