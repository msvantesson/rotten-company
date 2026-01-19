// components/ClientEvidenceLogger.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type Payload = {
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  meta?: Record<string, unknown>;
};

async function sendLog(payload: Payload) {
  try {
    // best-effort, do not block rendering
    await fetch("/api/debug/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // swallow network errors
  }
}

export default function ClientEvidenceLogger() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const start = Date.now();
    const ua = navigator.userAgent;
    const cookieHeader = document.cookie || null;
    const cookieNames = cookieHeader
      ? cookieHeader.split(";").map((c) => c.split("=")[0].trim()).filter(Boolean)
      : [];

    const initial = {
      level: "info",
      tag: "CLIENT-EVIDENCE",
      message: "client logger mounted",
      meta: {
        pathname,
        userAgent: ua,
        cookieNames,
        localStorageKeys: Object.keys(localStorage || {}),
        sessionStorageKeys: Object.keys(sessionStorage || {}),
        time: new Date().toISOString(),
      },
    };
    console.info("[CLIENT-EVIDENCE] mounted", initial.meta);
    sendLog(initial);

    // Router events: navigation start / complete
    const handleRouteChange = (url: string) => {
      const payload = {
        level: "info" as const,
        tag: "CLIENT-EVIDENCE",
        message: "route change",
        meta: { from: pathname, to: url, time: new Date().toISOString() },
      };
      console.info("[CLIENT-EVIDENCE] route change", payload.meta);
      sendLog(payload);
    };

    // Next.js App Router doesn't expose a global event emitter; use popstate and click capture
    const onPopState = () => handleRouteChange(location.pathname + location.search);
    window.addEventListener("popstate", onPopState);

    // Capture unhandled errors
    const onError = (ev: ErrorEvent) => {
      const payload = {
        level: "error" as const,
        tag: "CLIENT-EVIDENCE",
        message: ev.message,
        meta: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno, stack: ev.error?.stack },
      };
      console.error("[CLIENT-EVIDENCE] window error", payload.meta);
      sendLog(payload);
    };
    window.addEventListener("error", onError);

    // Capture unhandled promise rejections
    const onRejection = (ev: PromiseRejectionEvent) => {
      const payload = {
        level: "error" as const,
        tag: "CLIENT-EVIDENCE",
        message: "unhandledrejection",
        meta: { reason: String(ev.reason) },
      };
      console.error("[CLIENT-EVIDENCE] unhandled rejection", payload.meta);
      sendLog(payload);
    };
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      const duration = Date.now() - start;
      sendLog({ level: "info", tag: "CLIENT-EVIDENCE", message: "client logger unmounted", meta: { duration } });
    };
  }, [pathname, router]);

  return null;
}
