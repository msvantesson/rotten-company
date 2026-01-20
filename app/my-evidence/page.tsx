// app/my-evidence/[id]/page.tsx
import React from "react";
import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Evidence",
};

interface PageProps {
  params: { id: string };
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default async function MyEvidencePage({ params }: PageProps) {
  if (isDev()) {
    console.log("[MY-EVIDENCE] SHELL PAGE EXECUTED - START", {
      rawId: params?.id,
      time: new Date().toISOString(),
    });
  }

  const rawId = params?.id;
  const evidenceId = Number(rawId);
  const isValidId = Number.isInteger(evidenceId) && evidenceId > 0;

  if (isDev()) {
    console.log("[MY-EVIDENCE] route param", {
      rawId,
      parsed: evidenceId,
      isValidId,
    });
  }

  // We NEVER call notFound() here.
  // This page is just a shell so the client can:
  // - read document.cookie
  // - use supabase-js in the browser
  // - call /api/auth/me and /api/evidence/* with full auth context.
  // That avoids all the RSC cookie / auth weirdness.

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
          <strong>Missing or invalid evidence id</strong>
          <div>
            This URL does not contain a valid evidence id. If you came here from the app,
            try reloading or navigating from your evidence list.
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
            Server route loaded for evidence <code>#{evidenceId}</code>. The client will now:
          </div>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Check your authentication status in the browser</li>
            <li>Fetch the evidence details for this id</li>
            <li>Render the full evidence view once loaded</li>
          </ul>
        </div>
      )}

      <h1>My Evidence {isValidId ? `#${evidenceId}` : ""}</h1>
      <p>Loading your evidence details…</p>
    </main>
  );
}
