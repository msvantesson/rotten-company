"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client component for assigning a specific company_request to the current moderator.
 * When clicked, POSTs to /api/moderation/assign-company with { id, moderator_id }
 * and redirects to the admin detail page on success.
 */

type ClientModerateButtonProps = {
  companyRequestId: number;
  moderatorId: string;
  className?: string;
};

export default function ClientModerateButton({
  companyRequestId,
  moderatorId,
  className,
}: ClientModerateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/moderation/assign-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: companyRequestId,
          moderator_id: moderatorId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const errorMsg = json.error || "Failed to assign company";
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Redirect to admin detail page
      router.push(`/admin/moderation/evidence/${companyRequestId}`);
    } catch (err) {
      console.error("[ClientModerateButton] exception:", err);
      setError("Network error or unexpected failure");
      setIsLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleAssign}
        disabled={isLoading}
        className={
          className ||
          "rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        }
      >
        {isLoading ? "Assigning…" : "Moderate"}
      </button>

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
