"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClaimResponse = {
  ok: boolean;
  data?: { kind: "evidence" | "company_request"; item_id: string };
  error?: string;
};

export default function ClientClaimButton({
  moderatorId,
  disabled,
  label = "Get next evidence request",
}: {
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
      const res = await fetch("/api/moderation/claim-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderator_id: moderatorId }),
      });

      const json: ClaimResponse = await res.json();

      if (!json.ok || !json.data) {
        setError(json.error ?? "Failed to claim item");
        setIsPending(false);
        return;
      }

      // Redirect based on item type
      const { kind, item_id } = json.data;
      if (kind === "evidence") {
        router.push(`/admin/moderation/evidence/${item_id}`);
      } else if (kind === "company_request") {
        router.push(`/admin/moderation/evidence/${item_id}`);
      }
    } catch (err) {
      console.error("[ClientClaimButton] error:", err);
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
