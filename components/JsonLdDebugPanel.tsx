"use client";

import React, { useState } from "react";

type Props = {
  data: any; // JSON-LD payload
  debug?: any; // optional server debug object (searchParamsCountry, selectedDbValue, ...)
  initiallyOpen?: boolean;
};

export function JsonLdDebugPanel({ data, debug, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState(initiallyOpen);
  const [tab, setTab] = useState<"jsonld" | "debug">("jsonld");

  const pretty = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const copy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        /* ignore */
      });
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto 1rem", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>JSON-LD & debug</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setTab("jsonld")}
              style={{
                padding: "6px 8px",
                background: tab === "jsonld" ? "#111827" : "#f3f4f6",
                color: tab === "jsonld" ? "white" : "#111827",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              JSON-LD
            </button>
            {debug && (
              <button
                onClick={() => setTab("debug")}
                style={{
                  padding: "6px 8px",
                  background: tab === "debug" ? "#111827" : "#f3f4f6",
                  color: tab === "debug" ? "white" : "#111827",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Server debug
              </button>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: "#fffbeb",
            border: "1px solid #f5deb3",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => copy(pretty(tab === "jsonld" ? data : debug))}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Copy visible JSON
            </button>
            <button
              onClick={() => copy(pretty({ jsonld: data, debug }))}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Copy all
            </button>
          </div>

          <pre
            style={{
              maxHeight: 420,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              margin: 0,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {tab === "jsonld" ? pretty(data) : pretty(debug)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default JsonLdDebugPanel;
