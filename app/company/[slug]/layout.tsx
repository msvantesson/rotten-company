export default function CompanySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  console.log("CompanySlugLayout params:", params);
  return <>{children}</>;
}
