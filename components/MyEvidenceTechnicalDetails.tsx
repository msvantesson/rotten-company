"use client";

import { useState } from "react";

export default function MyEvidenceTechnicalDetails({
  evidence,
}: {
  evidence: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "6px 12px",
          fontSize: 13,
          borderRadius: 4,
          border: "1px solid #ccc",
          background: open ? "#eee" : "#f8f8f8",
          cursor: "pointer",
        }}
      >
        {open ? "Hide technical details" : "Show technical details"}
      </button>

      {open && (
        <pre
          style={{
            marginTop: 12,
            background: "#111",
            color: "#0f0",
            padding: 16,
            overflowX: "auto",
            fontSize: 12,
            borderRadius: 4,
          }}
        >
          {JSON.stringify(evidence, null, 2)}
        </pre>
      )}
    </section>
  );
}
