"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EvidenceUploadDebugPage() {
  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState<any | null>(null);
  const [clientSession, setClientSession] = useState<any | null>(null);
  const [cookieNames, setCookieNames] = useState<string[] | null>(null);
  const [authFetchInfo, setAuthFetchInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // 1) call server endpoint that reads HttpOnly cookies
        try {
          const res = await fetch("/api/auth/me", { cache: "no-store" });
          const text = await res.text();
          if (!mounted) return;
          setAuthFetchInfo(`/api/auth/me — ${res.status} — ${text}`);
          try {
            setServerUser(JSON.parse(text).user ?? null);
          } catch {
            setServerUser(null);
          }
        } catch (e) {
          if (!mounted) return;
          setAuthFetchInfo(`/api/auth/me fetch failed: ${String(e)}`);
          setServerUser(null);
        }

        // 2) client-side supabase session
        try {
          const { data } = await supabase.auth.getSession();
          if (!mounted) return;
          setClientSession(data?.session ?? null);
        } catch (e) {
          if (!mounted) return;
          setClientSession(null);
        }

        // 3) cookie names visible to document.cookie (names only)
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

    load();

    // keep client session in sync
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setClientSession(session ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading debug info…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Evidence Upload Debug — Server vs Client</h1>

      <div className="border rounded p-4">
        <h2 className="font-medium">Server auth (/api/auth/me)</h2>
        <pre className="text-sm bg-gray-50 p-3 rounded">
          {serverUser ? JSON.stringify(serverUser, null, 2) : "null"}
        </pre>
        <div className="text-xs text-gray-500 mt-2">{authFetchInfo}</div>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium">Client session (supabase.auth.getSession)</h2>
        <pre className="text-sm bg-gray-50 p-3 rounded">
          {clientSession ? JSON.stringify(clientSession, null, 2) : "null"}
        </pre>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-medium">Cookies visible to document.cookie (names)</h2>
        <div className="text-sm">{cookieNames === null ? "unable to read cookies" : cookieNames.join(", ") || "no cookies set"}</div>
      </div>

      <div className="text-xs text-gray-500">
        Use the same browser tab where you signed in. If serverUser is non‑null but clientSession is null, the client cannot read the HttpOnly session cookie — that is expected; rely on the server endpoint for auth checks.
      </div>
    </div>
  );
}
