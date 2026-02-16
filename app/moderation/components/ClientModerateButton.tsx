"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AssignResponse = {
  ok: boolean;
  id?: string;
  error?: string;
};

export default function ClientModerateButton({
  companyRequestId,
  moderatorId,
  disabled,
  label = "Moderate",
}: {
  companyRequestId: string;
  moderatorId: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (isPending || disabled) return;

    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/moderation/assign-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: companyRequestId, moderator_id: moderatorId }),
      });

      const json: AssignResponse = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Failed to assign company request");
        setIsPending(false);
        return;
      }

      // Redirect to unified admin detail page
      router.push(`/admin/moderation/evidence/${companyRequestId}`);
    } catch (err) {
      console.error("[ClientModerateButton] error:", err);
      setError("Network error");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Assigning…" : label}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
