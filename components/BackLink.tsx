"use client";

import { useRouter } from "next/navigation";

export default function BackLink({
  fallbackHref = "/categories",
  children = "← Back",
  className,
}: {
  fallbackHref?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // If there is history, go back; otherwise go to fallback
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
      style={{
        display: "inline-block",
        marginBottom: 16,
        fontSize: 14,
        color: "#2563eb",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}
