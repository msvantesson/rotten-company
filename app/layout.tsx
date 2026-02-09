import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
`.

---

## 🔧 FIXED `app/layout.tsx` (COPY‑PASTE)

```tsx
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

export const metadataimport Link from "next/link";
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
 : Metadata = {
  title: "Rotten Company",
  description: "Evidence-based corporate accountability platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="w-full border-b">
        <header className="w-full border-b">
          <div className="mx-auto max-w-6xl flex items-center justify-between py-4 px-6">
            <Link href="/" className="font-bold text-xl">
              Rotten Company
            </Link>

            {/* NavMenu now
          <div className="mx-auto max-w-6xl flex items-center justify-between py-4 px-6">
            <Link href="/" className="font-bold text-xl">
              Rotten Company
            </Link>

            {/* NavMenu now handles auth CLIENT‑SIDE */}
            <NavMenu />
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
