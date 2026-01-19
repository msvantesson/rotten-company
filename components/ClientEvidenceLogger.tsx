// components/ClientEvidenceLogger.tsx
"use client";

import { useEffect } from "react";

type Payload = {
  level: "info" | "warn" | "error";
  tag: string;
  message: string;
  meta?: Record<string, unknown>;
};

async function sendLog(payload: Payload) {
  try {
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
  useEffect(() => {
    const start = Date.now();
    const ua = navigator.userAgent;
    const cookieHeader = typeof document !== "undefined" ? document.cookie || null : null;
    const cookieNames = cookieHeader
      ? cookieHeader.split(";").map((c) => c.split("=")[0].trim()).filter(Boolean)
      : [];

    const initial = {
      level: "info" as const,
      tag: "CLIENT-EVIDENCE",
      message: "client logger mounted",
      meta: {
        href: typeof location !== "undefined" ? location.href : "(unknown)",
        userAgent: ua,
        cookieNames,
        localStorageKeys: typeof localStorage !== "undefined" ? Object.keys(localStorage) : [],
        sessionStorageKeys: typeof sessionStorage !== "undefined" ? Object.keys(sessionStorage) : [],
        time: new Date().toISOString(),
      },
    };

    console.info("[CLIENT-EVIDENCE] mounted", initial.meta);
    sendLog(initial);

    const onPopState = () => {
      const payload = {
        level: "info" as const,
        tag: "CLIENT-EVIDENCE",
        message: "route change (popstate)",
        meta: { href: typeof location !== "undefined" ? location.href : "(unknown)", time: new Date().toISOString() },
      };
      console.info("[CLIENT-EVIDENCE] route change", payload.meta);
      sendLog(payload);
    };
    window.addEventListener("popstate", onPopState);

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
  }, []);

  return null;
}
