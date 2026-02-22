#!/usr/bin/env node
/**
 * Regression check: verify that required Next.js route files exist at correct
 * (space-free) paths and that no paths with literal spaces exist under app/.
 *
 * Run via: node scripts/check-routes.mjs
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

let failed = false;

// 1. Assert the canonical route file exists.
const requiredRoutes = [
  "app/admin/moderation/company-requests/[id]/page.tsx",
];

for (const route of requiredRoutes) {
  if (!existsSync(route)) {
    console.error(`FAIL: required route file missing: ${route}`);
    failed = true;
  } else {
    console.log(`OK:   ${route}`);
  }
}

// 2. Walk app/ and assert no directory or file name contains a space.
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.includes(" ")) {
      console.error(`FAIL: path with space detected: ${join(dir, entry)}`);
      failed = true;
    }
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        walk(full);
      }
    } catch {
      // ignore stat errors
    }
  }
}

walk("app");

if (failed) {
  console.error("\nRoute check FAILED. See errors above.");
  process.exit(1);
} else {
  console.log("\nAll route checks passed.");
}
