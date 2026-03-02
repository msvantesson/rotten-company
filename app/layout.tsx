import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavMenu from "@/components/NavMenu";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rotten Company",
  description: "Evidence-based corporate accountability platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="w-full border-b border-border">
          <div className="relative mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 py-3 px-3 sm:py-4 sm:px-6">
            <Link href="/" className="font-bold text-xl">
              Rotten Company
            </Link>

            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link href="/rotten-index" className="hover:underline text-muted-foreground hover:text-foreground">
                Rotten Index
              </Link>
              <Link href="/submit-evidence" className="hover:underline text-muted-foreground hover:text-foreground">
                Submit Evidence
              </Link>
              <Link href="/rotten-score" className="hover:underline text-muted-foreground hover:text-foreground">
                Rotten Score
              </Link>
              <Link href="/leadership" className="hover:underline text-muted-foreground hover:text-foreground">
                Leadership
              </Link>
              <Link href="/login" className="hover:underline text-muted-foreground hover:text-foreground">
                Log in
              </Link>
            </nav>

            <NavMenu />

            <nav className="sm:hidden w-full flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium border-t border-border pt-2">
              <Link href="/rotten-index" className="hover:underline text-muted-foreground hover:text-foreground">
                Rotten Index
              </Link>
              <Link href="/submit-evidence" className="hover:underline text-muted-foreground hover:text-foreground">
                Submit Evidence
              </Link>
              <Link href="/rotten-score" className="hover:underline text-muted-foreground hover:text-foreground">
                Rotten Score
              </Link>
              <Link href="/leadership" className="hover:underline text-muted-foreground hover:text-foreground">
                Leadership
              </Link>
              <Link href="/login" className="hover:underline text-muted-foreground hover:text-foreground">
                Log in
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
