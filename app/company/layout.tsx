export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug?: string };
}) {
  console.log("CompanyLayout params:", params);
  return <>{children}</>;
}
