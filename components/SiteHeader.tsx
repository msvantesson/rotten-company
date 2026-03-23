"use client";

import Link from "next/link";

export default function SiteHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="w-full border-b border-border">
      <div className="relative mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 py-3 px-3 sm:py-4 sm:px-6">
        <Link href="/" className="font-bold text-xl">
          Rotten Company
        </Link>

        <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
          <Link
            href="/rotten-index"
            className="hover:underline text-muted-foreground hover:text-foreground"
          >
            Rotten Index
          </Link>

          <Link
            href="/submit-evidence"
            className="hover:underline text-muted-foreground hover:text-foreground"
          >
            Submit Evidence
          </Link>

          <Link
            href="/rotten-score"
            className="hover:underline text-muted-foreground hover:text-foreground"
          >
            Rotten Score
          </Link>

          <Link
            href="/leadership"
            className="hover:underline text-muted-foreground hover:text-foreground"
          >
            Leadership
          </Link>

          <Link
            href="/moderation-guidelines"
            className="hover:underline text-muted-foreground hover:text-foreground"
          >
            Moderation Guidelines
          </Link>
        </nav>

        {children}
      </div>
    </header>
  );
}