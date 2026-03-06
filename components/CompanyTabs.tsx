"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  slug: string;
};

type Tab = {
  label: string;
  href: (slug: string) => string;
  isActive?: (pathname: string, slug: string) => boolean;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function CompanyTabs({ slug }: Props) {
  const pathname = usePathname() || "";

  const tabs: Tab[] = [
    {
      label: "Overview",
      href: (s) => `/company/${s}`,
      isActive: (p, s) => p === `/company/${s}`,
    },
    {
      label: "Evidence",
      href: (s) => `/company/${s}/evidence`,
      isActive: (p, s) => p.startsWith(`/company/${s}/evidence`),
    },
    {
      label: "Breakdown",
      href: (s) => `/company/${s}/breakdown`,
      isActive: (p, s) => p.startsWith(`/company/${s}/breakdown`),
    },
    {
      label: "Submit",
      href: (s) => `/company/${s}/submit-evidence`,
      isActive: (p, s) => p.startsWith(`/company/${s}/submit-evidence`),
    },
    {
      label: "Edit company",
      href: (s) => `/company/${s}/suggest-edit`,
      isActive: (p, s) => p.startsWith(`/company/${s}/suggest-edit`),
    },
  ];

  return (
    <nav className="mt-4 border-b border-border">
      <ul className="flex flex-wrap gap-4 text-sm">
        {tabs.map((t) => {
          const href = t.href(slug);
          const active = t.isActive ? t.isActive(pathname, slug) : pathname === href;
          return (
            <li key={t.label}>
              <Link
                href={href}
                className={cx(
                  "inline-block pb-2",
                  active
                    ? "border-b-2 border-black font-medium text-black"
                    : "text-neutral-600 hover:text-black",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}