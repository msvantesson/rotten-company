// components/EvidenceAnchorButton.tsx
"use client";

import React from "react";

type Props = {
  id: string | number;
  className?: string;
  children?: React.ReactNode;
};

export default function EvidenceAnchorButton({ id, className, children }: Props) {
  const href = `/my-evidence/${id}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Browser console log to verify id and href before navigation
    console.log("[EvidenceAnchorButton] clicked, id:", id, "href:", href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      style={{ textDecoration: "none", display: "inline-block" }}
      aria-label={`Open evidence ${id}`}
    >
      <button
        type="button"
        style={{
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          background: "#fff",
        }}
      >
        {children ?? `Open evidence #${id}`}
      </button>
    </a>
  );
}
