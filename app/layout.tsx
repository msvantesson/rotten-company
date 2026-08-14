import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import NavMenu from "@/components/NavMenu";
import { Analytics } from "@vercel/analytics/next";
import { SITE_ORIGIN } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rotten Company",
    template: "%s | Rotten Company",
  },
  description:
    "Evidence-based corporate accountability platform. Browse verified misconduct records and Rotten Scores for companies worldwide.",
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    siteName: "Rotten Company",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  verification: {
    other: {
      "msvalidate.01": "30E88D4C76DD919980B264526E673ACC",
    },
  },
};

// WebSite JSON-LD — site-level structured data for search engines.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Rotten Company",
  url: SITE_ORIGIN,
  description:
    "Evidence-based corporate accountability platform. Browse verified misconduct records and Rotten Scores for companies worldwide.",
  publisher: {
    "@type": "Organization",
    name: "Rotten Company",
    url: SITE_ORIGIN,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_ORIGIN}/rotten-index?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SiteHeader>
          <NavMenu />
        </SiteHeader>

        <main>{children}</main>
        <footer className="w-full border-t border-border">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-6 text-sm text-muted-foreground">
            <Link href="/disclaimer" className="hover:text-foreground hover:underline">
              Disclaimer
            </Link>
            <Link
              href="/moderation-guidelines"
              className="hover:text-foreground hover:underline"
            >
              Moderation Guidelines
            </Link>
            <Link href="/contact" className="hover:text-foreground hover:underline">
              Contact
            </Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
