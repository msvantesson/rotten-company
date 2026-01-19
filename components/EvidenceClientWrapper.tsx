// components/EvidenceClientWrapper.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ClientEvidenceLogger from "@/components/ClientEvidenceLogger";

export default function EvidenceClientWrapper() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkSessionAndReload() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        if (res.ok) {
          const body = await res.json();
          if (body?.user) {
            // Force a client navigation to re-run the server render with cookies
            router.replace(window.location.pathname + window.location.search);
            return;
          }
        }
        // If not authenticated, do nothing (client remains on fallback)
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[EvidenceClientWrapper] session check failed", err);
        }
      }
    }

    checkSessionAndReload();

    return () => {
      mounted = false;
    };
  }, [router]);

  return <ClientEvidenceLogger />;
}
