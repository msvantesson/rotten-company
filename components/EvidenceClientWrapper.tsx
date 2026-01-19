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
        // call auth endpoint that returns { user: ... } when cookies are present
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!mounted) return;

        if (res.ok) {
          const body = await res.json();
          // If server sees a user, force a client navigation to re-run the server render
          if (body?.user) {
            // replace so we don't add history entries
            router.replace(window.location.pathname + window.location.search);
            return;
          }
        }
        // If not ok or no user, do nothing — user is not authenticated on client
      } catch (err) {
        // Non-fatal; keep logger but avoid noisy errors in production
        if (process.env.NODE_ENV !== "production") {
          console.warn("[EvidenceClientWrapper] session check failed", err);
        }
      }
    }

    // Run once on mount
    checkSessionAndReload();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Keep the existing client logger UI so you don't lose telemetry
  return <ClientEvidenceLogger />;
}
