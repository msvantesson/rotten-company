import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

import { supabaseServer } from "@/lib/supabase-server";
import { canModerate } from "@/lib/moderation-guards";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isModerator = user ? await canModerate(user.id) : false;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="w-full border-b">
          <div className="mx-auto max-w-6xl flex items-center justify-between py-4 px-6">
            <Link href="/" className="font-bold text-xl">
              Rotten Company
            </Link>

            {user ? (
              <NavMenu user={user} isModerator={isModerator} />
            ) : (
              <div className="flex gap-4">
                <Link href="/signup" className="text-sm font-medium">
                  Sign up
                </Link>
                <Link href="/login" className="text-sm font-medium">
                  Log in
                </Link>
              </div>
            )}
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}
