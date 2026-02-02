// lib/log.ts
const ENABLE_DEBUG_LOGS =
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true";

export function logDebug(scope: string, message: string, data?: unknown) {
  if (!ENABLE_DEBUG_LOGS) return;
  console.log(`[RC][${scope}] ${message}`, data ?? "");
}
