// app/my-evidence/[id]/page.tsx

import React from "react";
import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import type { Metadata } from "next";

// Force this route to always run dynamically with cookies
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "My Evidence",
};

interface PageProps {
  params: { id?: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default async function MyEvidencePage({ params, searchParams = {} }: PageProps) {
  const rawId = params?.id ?? null;

  if (isDev()) {
    console.log("[MY-EVIDENCE] SHELL EXECUTED", {
      rawId,
      searchParams,
      time: new Date().toISOString(),
    });
  }

  // Parse id safely
  const evidenceId = Number(rawId);
  const isValidId = Number.isInteger(evidenceId) && evidenceId > 0;

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper />

      {!isValidId && (
        <div
          style={{
            background: "#fff7e6",
            padding: 12,
            border: "1px solid #f0c36b",
            marginBottom: 12,
          }}
        >
          <strong>Invalid evidence id</strong>
          <div>
            This URL does not contain a valid evidence id. If you navigated here from the app,
            the client will re-check and load the correct evidence.
          </div>
        </div>
      )}

      {isValidId && (
        <div
          style={{
            background: "#f0f5ff",
            padding: 12,
            border: "1px solid #adc6ff",
            marginBottom: 12,
          }}
        >
          <strong>Evidence page shell</strong>
          <div>
            Server route loaded for evidence <code>#{evidenceId}</code>.  
            The client will now:
          </div>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Check your authentication status</li>
            <li>Fetch the evidence details</li>
            <li>Render the full evidence view</li>
          </ul>
        </div>
      )}

      <h1>My Evidence {isValidId ? `#${evidenceId}` : ""}</h1>
      <p>Loading your evidence details…</p>
    </main>
  );
}
