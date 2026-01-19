// components/EvidenceClientWrapper.tsx
"use client";

import ClientEvidenceLogger from "@/components/ClientEvidenceLogger";

export default function EvidenceClientWrapper() {
  // This component is intentionally minimal: it mounts the client logger.
  return <ClientEvidenceLogger />;
}
