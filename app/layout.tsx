import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavMenu from "@/components/NavMenu";

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
        <header className="w-full border-b">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 py-3 px-3 sm:py-4 sm:px-6">
            <Link href="/" className="font-bold text-xl">
              Rotten Company
            </Link>

            <NavMenu />
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
