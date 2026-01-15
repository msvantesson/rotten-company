"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EvidenceUploadDebugPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [role, setRole] = useState<string>("anonymous");
  const [envInfo, setEnvInfo] = useState({
    environment: process.env.NODE_ENV || "production",
    branch: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || "main",
    deploymentDomain: typeof window !== "undefined" ? window.location.hostname : "",
  });
  const [recentRequests, setRecentRequests] = useState<string[]>([]);
  const [cookieNames, setCookieNames] = useState<string[] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // Prefer getSession for client session info, fallback to getUser
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          if (!mounted) return;
          setSessionUser(sessionData.session.user);
          setRole("authenticated");
        } else {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            if (!mounted) return;
            setSessionUser(userData.user);
            setRole("authenticated");
          } else {
            setSessionUser(null);
            setRole("anonymous");
          }
        }

        // Capture recent navigation entries
        const nav = performance.getEntriesByType("navigation") || [];
        const navText = nav.length
          ? nav.map((n) => `${n.name} — ${Math.round((n as any).duration)}ms`)
          : [`${window.location.href} — loaded`];
        if (mounted) setRecentRequests(navText.slice(-5).reverse());

        // Read cookie names for current domain (names only)
        try {
          const cookies = document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => c.split("=")[0]);
          if (mounted) setCookieNames(cookies);
        } catch (e) {
          if (mounted) setCookieNames(null);
        }
      } catch (err) {
        console.error("Debug load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setSessionUser(session.user);
        setRole("authenticated");
      } else {
        setSessionUser(null);
        setRole("anonymous");
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Loading debug info…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Evidence Upload Debug</h1>

      <div className="bg-white border rounded p-4 space-y-2">
        <div><strong>Role:</strong> {role}</div>
        <div>
          <strong>Email:</strong>{" "}
          {sessionUser?.email ?? <span className="text-gray-500">not signed in</span>}
        </div>
        <div>
          <strong>User ID:</strong>{" "}
          {sessionUser?.id ?? <span className="text-gray-500">none</span>}
        </div>
      </div>

      <div className="bg-white border rounded p-4 space-y-2">
        <h2 className="font-medium">Environment</h2>
        <div><strong>Environment:</strong> {envInfo.environment}</div>
        <div><strong>Branch:</strong> {envInfo.branch}</div>
        <div><strong>Deployment domain:</strong> {envInfo.deploymentDomain}</div>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-medium">Recent requests</h2>
        <ul className="text-sm list-disc list-inside">
          {recentRequests.length ? (
            recentRequests.map((r, i) => <li key={i}>{r}</li>)
          ) : (
            <li className="text-gray-500">no recent requests captured</li>
          )}
        </ul>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="font-medium">Cookies (names)</h2>
        <div className="text-sm text-gray-700">
          {cookieNames === null ? (
            <span className="text-gray-500">unable to read cookies</span>
          ) : cookieNames.length ? (
            cookieNames.join(", ")
          ) : (
            <span className="text-gray-500">no cookies set</span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        This page is for debugging only. Do not expose it in production to untrusted users.
      </div>
    </div>
  );
}
