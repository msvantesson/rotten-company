"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CompanyTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  const tabs = [
    { label: "Overview", href: `/company/${slug}` },
    { label: "Evidence", href: `/company/${slug}/evidence` },
    { label: "Breakdown", href: `/company/${slug}/breakdown` },
    { label: "Submit", href: `/company/${slug}/submit-evidence` },
    { label: "Suggest edit", href: `/company/${slug}/suggest-edit` },
  ];

  return (
    <nav className="flex gap-4 mt-4 border-b border-border text-sm">
      {tabs.map((tab) => {
        const isActive =
          tab.href === `/company/${slug}`
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-2 font-medium transition-colors ${
              isActive
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}