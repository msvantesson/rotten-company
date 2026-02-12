"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const supabase = supabaseBrowser();

export default function TestUploadPage() {
  const router = useRouter();
  const [entityId, setEntityId] = useState<number>(1);
  const [entityType, setEntityType] = useState<
    "company" | "leader" | "manager" | "owner"
  >("company");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userPresent, setUserPresent] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
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
    };

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
    return null;
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Test Evidence Upload</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Entity ID</label>
        <input
          type="number"
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={entityId}
          onChange={(e) => setEntityId(Number(e.target.value) || 1)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Entity Type</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={entityType}
          onChange={(e) =>
            setEntityType(e.target.value as "company" | "leader" | "manager" | "owner")
          }
        >
          <option value="company">Company</option>
          <option value="leader">Leader</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(
            `/evidence-upload?entityType=${encodeURIComponent(
              entityType,
            )}&entityId=${encodeURIComponent(String(entityId))}`,
          )
        }
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium"
      >
        Go to upload page
      </button>
    </main>
  );
}
