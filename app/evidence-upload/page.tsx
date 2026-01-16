// app/evidence-upload/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EvidenceUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState<any | null>(null);
  const [clientSession, setClientSession] = useState<any | null>(null);
  const [cookieNames, setCookieNames] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch server-side auth info (reads HttpOnly cookie via API)
  async function refreshServerUser() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      setServerUser(json?.user ?? null);
      return json?.user ?? null;
    } catch {
      setServerUser(null);
      return null;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDebug() {
      try {
        // server-side user (reads HttpOnly cookies)
        try {
          const user = await refreshServerUser();
          if (!mounted) return;
          setServerUser(user);
        } catch {
          if (!mounted) return;
          setServerUser(null);
        }

        // client-side session (may be null if session stored in HttpOnly cookies)
        try {
          const { data } = await supabase.auth.getSession();
          if (!mounted) return;
          setClientSession(data?.session ?? null);
        } catch {
          if (!mounted) return;
          setClientSession(null);
        }

        // cookie names visible to document.cookie
        try {
          const cookies = document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => c.split("=")[0]);
          if (!mounted) return;
          setCookieNames(cookies);
        } catch {
          if (!mounted) return;
          setCookieNames(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDebug();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setClientSession(session ?? null);
      // When client auth changes re-check server-side user
      refreshServerUser();
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (submitting) return;
    setSubmitting(true);

    try {
      // debug: inspect event targets to help diagnose issues where FormData fails
      console.info("[EVIDENCE UPLOAD] submit event:", {
        currentTarget: e.currentTarget,
        target: e.target,
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
        setError("Unable to read the form element. Please try again.");
        setSubmitting(false);
        return;
      }

      // Ensure server sees an authenticated user before uploading
      const currentServerUser = await refreshServerUser();
      if (!currentServerUser) {
        setError("You must be signed in to submit evidence. Please sign in and try again.");
        setSubmitting(false);
        return;
      }

      const fd = new FormData(formEl);

      const res = await fetch("/api/evidence/submit", {
        method: "POST",
        body: fd,
        // ensure cookies are sent so server-side auth reads HttpOnly cookies
        credentials: "same-origin",
      });

      // handle explicit auth failure early
      if (res.status === 401) {
        setError("Not authenticated: please sign in and try again.");
        setSubmitting(false);
        return;
      }

      const payload = await res.json().catch(() => null);

      if (res.ok && payload?.success) {
        console.info("[EVIDENCE UPLOAD] submit response payload:", payload);

        // tolerate several shapes for returned id
        const evidenceId =
          payload?.evidenceId ?? payload?.evidence?.id ?? payload?.evidence_id ?? payload?.id ?? null;

        if (evidenceId) {
          // navigate client-side; fall back to full redirect if router fails
          try {
            router.push(`/my-evidence/${evidenceId}`);
          } catch {
            window.location.href = `/my-evidence/${evidenceId}`;
          }
          return;
        }

        setError("Upload succeeded but server did not return an evidence id.");
        setSubmitting(false);
        return;
      }

      // Show server-provided error or a generic message
      if (payload?.error) {
        setError(String(payload.error));
      } else if (!res.ok) {
        setError(`Upload failed: ${res.status} ${res.statusText}`);
      } else {
        setError("Upload failed");
      }
    } catch (err: any) {
      setError(String(err?.message ?? err ?? "Unexpected error"));
    } finally {
      setSubmitting(false);
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
