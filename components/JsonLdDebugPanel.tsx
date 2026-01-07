"use client";

import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JsonLdDebugPanel({ data }: { data: any }) {
  const [open, setOpen] = useState(false);

  // Only show when ?debug=jsonld is in the URL
  // Initialize state directly from URL on mount (no effect needed)
  const [enabled] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("debug") === "jsonld";
    }
    return false;
  });

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: open ? "500px" : "200px",
        maxHeight: open ? "70vh" : "50px",
        overflow: "hidden",
        background: "#111",
        color: "#0f0",
        borderRadius: "8px",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 999999,
        boxShadow: "0 0 20px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          cursor: "pointer",
          fontWeight: "bold",
          marginBottom: open ? "10px" : "0",
        }}
        onClick={() => setOpen(!open)}
      >
        {open ? "▼ JSON‑LD Debug Panel" : "▲ JSON‑LD Debug"}
      </div>

      {open && (
        <pre
          style={{
            overflow: "auto",
            maxHeight: "60vh",
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
