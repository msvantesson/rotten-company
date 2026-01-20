"use client";

import { useEffect } from "react";
import ClientEvidenceLogger from "@/components/ClientEvidenceLogger";

export default function EvidenceClientWrapper() {
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        // Do NOT redirect. Just let the server render stand.
        // The client can fetch evidence normally.
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[EvidenceClientWrapper] session check failed", err);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  return <ClientEvidenceLogger />;
}
