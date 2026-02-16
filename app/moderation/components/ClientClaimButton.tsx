"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client component for claiming the next moderation item.
 * When clicked, POSTs to /api/moderation/claim-next with moderator_id
 * and redirects to the appropriate admin detail page.
 */

type ClientClaimButtonProps = {
  moderatorId: string;
  disabled?: boolean;
  className?: string;
};

export default function ClientClaimButton({
  moderatorId,
  disabled = false,
  className,
}: ClientClaimButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    if (isLoading || disabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/moderation/claim-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderator_id: moderatorId }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        const errorMsg = json.error || "Failed to claim item";
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Redirect based on kind
      const { kind, item_id } = json.data;

      if (kind === "evidence") {
        router.push(`/admin/moderation/evidence/${item_id}`);
      } else if (kind === "company_request") {
        router.push(`/admin/moderation/evidence/${item_id}`);
      } else {
        setError("Unknown item type returned");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("[ClientClaimButton] exception:", err);
      setError("Network error or unexpected failure");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClaim}
        disabled={isLoading || disabled}
        className={
          className ||
          "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        }
      >
        {isLoading ? "Claiming…" : "Get next evidence request"}
      </button>

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
