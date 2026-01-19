// app/evidence-upload/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
const supabase = supabaseBrowser();

type LogLevel = "info" | "warn" | "error";

async function sendClientLog(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  try {
    // best-effort: do not block UI
    await fetch("/api/debug/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, tag, message, meta }),
      keepalive: true,
    });
  } catch {
    // swallow network errors
  }
}

export default function EvidenceUploadPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState<any | null>(null);
  const [clientSession, setClientSession] = useState<any | null>(null);
  const [cookieNames, setCookieNames] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch server-side auth info (reads HttpOnly cookie via API)
  async function refreshServerUser() {
    const t0 = performance.now();
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const took = Math.round(performance.now() - t0);
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        console.warn("[EVIDENCE UPLOAD] /api/auth/me JSON parse failed", e);
        await sendClientLog("warn", "EVIDENCE-AUTH", "auth JSON parse failed", { status: res.status, statusText: res.statusText });
      }
      await sendClientLog("info", "EVIDENCE-AUTH", "fetched /api/auth/me", { status: res.status, took });
      setServerUser(json?.user ?? null);
      return json?.user ?? null;
    } catch (err) {
      await sendClientLog("error", "EVIDENCE-AUTH", "fetch /api/auth/me failed", { error: String(err) });
      setServerUser(null);
      return null;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    const start = Date.now();
    sendClientLog("info", "EVIDENCE-PAGE", "mount start", {
      href: typeof location !== "undefined" ? location.href : "(unknown)",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "(unknown)",
      time: new Date().toISOString(),
    });

    async function loadDebug() {
      try {
        // server-side user (reads HttpOnly cookies)
        try {
          const user = await refreshServerUser();
          if (!mountedRef.current) return;
          setServerUser(user);
          await sendClientLog("info", "EVIDENCE-PAGE", "serverUser loaded", { userId: user?.id ?? null });
        } catch (err) {
          if (!mountedRef.current) return;
          setServerUser(null);
          await sendClientLog("error", "EVIDENCE-PAGE", "refreshServerUser threw", { error: String(err) });
        }

        // client-side session (may be null if session stored in HttpOnly cookies)
        try {
          const t0 = performance.now();
          const { data } = await supabase.auth.getSession();
          const took = Math.round(performance.now() - t0);
          if (!mountedRef.current) return;
          setClientSession(data?.session ?? null);
          await sendClientLog("info", "EVIDENCE-PAGE", "supabase.auth.getSession", { took, sessionPresent: !!data?.session });
        } catch (err) {
          if (!mountedRef.current) return;
          setClientSession(null);
          await sendClientLog("error", "EVIDENCE-PAGE", "supabase.getSession threw", { error: String(err) });
        }

        // cookie names visible to document.cookie
        try {
          const raw = typeof document !== "undefined" ? document.cookie : "";
          const cookies = raw
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => c.split("=")[0]);
          if (!mountedRef.current) return;
          setCookieNames(cookies);
          await sendClientLog("info", "EVIDENCE-PAGE", "document.cookie read", { cookieNames: cookies, rawLength: raw.length });
        } catch (err) {
          if (!mountedRef.current) return;
          setCookieNames(null);
          await sendClientLog("error", "EVIDENCE-PAGE", "reading document.cookie failed", { error: String(err) });
        }
      } finally {
        if (mountedRef.current) setLoading(false);
        await sendClientLog("info", "EVIDENCE-PAGE", "loadDebug finished", { durationMs: Date.now() - start });
      }
    }

    loadDebug();

    // auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      await sendClientLog("info", "EVIDENCE-AUTH", "onAuthStateChange", { event, sessionPresent: !!session });
      if (!mountedRef.current) return;
      setClientSession(session ?? null);
      // When client auth changes re-check server-side user
      await refreshServerUser();
    });

    // global error handlers for extra telemetry
    const onError = (ev: ErrorEvent) => {
      sendClientLog("error", "EVIDENCE-CLIENT", "window error", {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        stack: ev.error?.stack,
      });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      sendClientLog("error", "EVIDENCE-CLIENT", "unhandledrejection", { reason: String(ev.reason) });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      mountedRef.current = false;
      listener?.subscription?.unsubscribe?.();
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      sendClientLog("info", "EVIDENCE-PAGE", "unmount", { time: new Date().toISOString() });
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (submitting) {
      await sendClientLog("warn", "EVIDENCE-UPLOAD", "submit ignored: already submitting");
      return;
    }
    setSubmitting(true);
    const submitStart = performance.now();

    try {
      // debug: inspect event targets to help diagnose issues where FormData fails
      console.info("[EVIDENCE UPLOAD] submit event:", {
        currentTarget: e.currentTarget,
        target: e.target,
        type: e.type,
      });
      await sendClientLog("info", "EVIDENCE-UPLOAD", "submit event", {
        currentTarget: String(e.currentTarget?.tagName ?? "(none)"),
        target: String((e.target as HTMLElement)?.tagName ?? "(none)"),
        type: e.type,
      });

      // Prefer the event's currentTarget when it's a real form element
      let formEl: HTMLFormElement | null = null;
      if (e.currentTarget instanceof HTMLFormElement) {
        formEl = e.currentTarget;
      } else {
        // fallback: find the closest form from the event target
        const maybe = (e.target as HTMLElement | null)?.closest?.("form");
        formEl = maybe instanceof HTMLFormElement ? maybe : null;
      }

      if (!formEl) {
        const msg = "Unable to read the form element. Please try again.";
        setError(msg);
        await sendClientLog("error", "EVIDENCE-UPLOAD", "form element missing", {});
        setSubmitting(false);
        return;
      }

      // Ensure server sees an authenticated user before uploading
      const currentServerUser = await refreshServerUser();
      if (!currentServerUser) {
        const msg = "You must be signed in to submit evidence. Please sign in and try again.";
        setError(msg);
        await sendClientLog("warn", "EVIDENCE-UPLOAD", "no server user before submit", {});
        setSubmitting(false);
        return;
      }

      // Build FormData and log its entries (names and sizes only)
      const fd = new FormData(formEl);
      const entries: Record<string, unknown>[] = [];
      for (const pair of Array.from(fd.entries())) {
        const [k, v] = pair as [string, FormDataEntryValue];
        if (v instanceof File) {
          entries.push({ key: k, fileName: v.name, fileType: v.type, fileSize: v.size });
        } else {
          entries.push({ key: k, value: String(v).slice(0, 200) });
        }
      }
      await sendClientLog("info", "EVIDENCE-UPLOAD", "formdata entries", { entries });

      // Attach diagnostic headers (non-sensitive) to help server correlate logs
      const correlationId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch("/api/evidence/submit", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
        headers: {
          // Note: do not include cookies or tokens here; this header is for correlation only
          "x-client-correlation-id": correlationId,
        } as HeadersInit,
      });

      await sendClientLog("info", "EVIDENCE-UPLOAD", "submit request sent", {
        correlationId,
        status: res.status,
        statusText: res.statusText,
      });

      // handle explicit auth failure early
      if (res.status === 401) {
        setError("Not authenticated: please sign in and try again.");
        await sendClientLog("warn", "EVIDENCE-UPLOAD", "server returned 401", { correlationId });
        setSubmitting(false);
        return;
      }

      // read response body safely and log it
      let payload: any = null;
      try {
        const text = await res.text();
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = { rawText: text };
        }
        await sendClientLog("info", "EVIDENCE-UPLOAD", "response body", { correlationId, payload });
      } catch (err) {
        await sendClientLog("error", "EVIDENCE-UPLOAD", "reading response body failed", { error: String(err) });
      }

      // Accept multiple success shapes
      const success =
        (res.ok && (payload?.ok === true || payload?.success === true || payload?.id || payload?.evidence?.id)) ??
        false;

      if (res.ok && (payload?.ok === true || payload?.success === true)) {
        await sendClientLog("info", "EVIDENCE-UPLOAD", "server indicated success", { correlationId, payload });
      }

      if (success) {
        // tolerate several shapes for returned id
        const evidenceId =
          payload?.evidenceId ?? payload?.evidence?.id ?? payload?.evidence_id ?? payload?.id ?? null;

        await sendClientLog("info", "EVIDENCE-UPLOAD", "resolved evidence id", { evidenceId, correlationId });

        if (evidenceId) {
          // navigate client-side; use replace + refresh to avoid stale 404s
          try {
            router.replace(`/my-evidence/${evidenceId}`);
            router.refresh();
            await sendClientLog("info", "EVIDENCE-UPLOAD", "navigated to evidence page", { evidenceId, correlationId });
          } catch (navErr) {
            // fallback to full redirect
            window.location.href = `/my-evidence/${evidenceId}`;
            await sendClientLog("warn", "EVIDENCE-UPLOAD", "router navigation failed, used full redirect", {
              error: String(navErr),
              evidenceId,
              correlationId,
            });
          }
          return;
        }

        setError("Upload succeeded but server did not return an evidence id.");
        await sendClientLog("warn", "EVIDENCE-UPLOAD", "no evidence id returned", { payload, correlationId });
        setSubmitting(false);
        return;
      }

      // Show server-provided error or a generic message
      if (payload?.error) {
        setError(String(payload.error));
        await sendClientLog("error", "EVIDENCE-UPLOAD", "server error payload", { payload, correlationId });
      } else if (!res.ok) {
        const msg = `Upload failed: ${res.status} ${res.statusText}`;
        setError(msg);
        await sendClientLog("error", "EVIDENCE-UPLOAD", "non-ok response", { status: res.status, statusText: res.statusText, correlationId });
      } else {
        setError("Upload failed");
        await sendClientLog("error", "EVIDENCE-UPLOAD", "unknown upload failure", { correlationId, payload });
      }
    } catch (err: any) {
      const message = String(err?.message ?? err ?? "Unexpected error");
      setError(message);
      await sendClientLog("error", "EVIDENCE-UPLOAD", "submit threw", { error: message });
    } finally {
      setSubmitting(false);
      await sendClientLog("info", "EVIDENCE-UPLOAD", "submit finished", { durationMs: Math.round(performance.now() - submitStart) });
    }
  }

  if (loading) {
    return <div className="p-6">Loading debug info…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Evidence Upload Debug</h1>

      <div className="border rounded p-4">
        <h2 className="font-medium">Server auth (/api/auth/me)</h2>
        <pre className="text-sm bg-gray-50 p-3 rounded">
          {serverUser ? JSON.stringify(serverUser, null, 2) : "null"}
        </pre>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium">Client session (supabase.auth.getSession)</h2>
        <pre className="text-sm bg-gray-50 p-3 rounded">
          {clientSession ? JSON.stringify(clientSession, null, 2) : "null"}
        </pre>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium">Cookies visible to document.cookie (names)</h2>
        <div className="text-sm">
          {cookieNames === null ? "unable to read cookies" : cookieNames.join(", ") || "no cookies set"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border rounded p-4 space-y-4" encType="multipart/form-data">
        <h2 className="font-medium">Submit Evidence</h2>

        <div>
          <label className="block text-sm font-medium">Entity Type</label>
          <select name="entityType" defaultValue="company" required className="mt-1 p-2 border rounded w-full">
            <option value="company">company</option>
            <option value="leader">leader</option>
            <option value="owner">owner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Entity ID</label>
          <input name="entityId" defaultValue="1" required className="mt-1 p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">Title</label>
          <input name="title" defaultValue="Test upload" required className="mt-1 p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">Category</label>
          <input name="category" defaultValue="general" required className="mt-1 p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block text-sm font-medium">File</label>
          <input name="file" type="file" accept="image/*,application/pdf" required className="mt-1" />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {submitting ? "Uploading…" : "Submit Evidence"}
          </button>
        </div>
      </form>

      <div className="text-xs text-gray-500">
        This page is for debugging only. Do not expose it in production to untrusted users.
      </div>
    </div>
  );
}
