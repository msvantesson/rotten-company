"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  slug: string;
};

export default function CompanyTabs({ slug }: Props) {
  const pathname = usePathname();

  const tabs = [
    { label: "Overview", href: `/company/${slug}` },
    { label: "Evidence", href: `/company/${slug}/evidence` },
    { label: "Breakdown", href: `/company/${slug}/breakdown` },

    // New: move "Submit Evidence" into the tab bar.
    // Note: auth gating should be handled server-side on the submit page (it already redirects to /login).
    { label: "Submit", href: `/company/${slug}/submit-evidence` },
  ];

  return (
    <nav className="flex gap-1 border-b border-border mt-4 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "px-4 py-2 text-sm font-medium rounded-t transition-colors",
              isActive
                ? "border border-b-0 border-border bg-surface text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
