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

  return (
    <a
      href={href}
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
