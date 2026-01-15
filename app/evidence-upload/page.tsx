"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EvidenceUpload from "@/components/EvidenceUpload";

export default function EvidenceUploadPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userPresent, setUserPresent] = useState(false);

  // Default entity values for testing
  const [entityType, setEntityType] = useState<
    "company" | "leader" | "manager" | "owner"
  >("company");
  const [entityId, setEntityId] = useState<number>(1);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUserPresent(false);
        setCheckingAuth(false);
        router.push("/login");
        return;
      }

      setUserPresent(true);
      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Checking authentication…</p>
      </div>
    );
  }

  if (!userPresent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Upload Evidence</h1>

      <p className="text-sm text-gray-600">
        This page is for testing and manual uploads.  
        In production, contributors upload evidence directly from company pages.
      </p>

      {/* Entity Type */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Entity Type</label>
        <select
          value={entityType}
          onChange={(e) =>
            setEntityType(
              e.target.value as "company" | "leader" | "manager" | "owner"
            )
          }
          className="border p-2 rounded w-full"
        >
          <option value="company">Company</option>
          <option value="leader">Leader</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      {/* Entity ID */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">Entity ID</label>
        <input
          type="number"
          value={entityId}
          onChange={(e) => setEntityId(Number(e.target.value))}
          className="border p-2 rounded w-full"
        />
      </div>

      {/* Upload Component */}
      <div className="pt-4 border-t">
        <EvidenceUpload entityId={entityId} entityType={entityType} />
      </div>
    </div>
  );
}
