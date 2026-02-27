#!/usr/bin/env node
/**
 * Regression check: verify that required Next.js route files exist at correct
 * (space-free) paths and that no paths with literal spaces exist under app/.
 *
 * Also checks that community evidence moderation forms use the field names
 * expected by app/moderation/actions.ts (evidence_id, moderator_note).
 *
 * Run via: node scripts/check-routes.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
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

// 3. Verify that the community evidence moderation page uses the field names
//    expected by app/moderation/actions.ts (evidence_id and moderator_note).
const communityEvidencePage =
  "app/moderation/evidence/[id]/page.tsx";
if (!existsSync(communityEvidencePage)) {
  console.error(`FAIL: community evidence moderation page missing: ${communityEvidencePage}`);
  failed = true;
} else {
  const src = readFileSync(communityEvidencePage, "utf8");

  if (!src.includes('name="evidence_id"')) {
    console.error(
      `FAIL: ${communityEvidencePage} is missing name="evidence_id" — ` +
        "form must match app/moderation/actions.ts which reads formData.get(\"evidence_id\")",
    );
    failed = true;
  } else {
    console.log(`OK:   ${communityEvidencePage} contains name="evidence_id"`);
  }

  if (!src.includes('name="moderator_note"')) {
    console.error(
      `FAIL: ${communityEvidencePage} is missing name="moderator_note" — ` +
        "form must match app/moderation/actions.ts which reads formData.get(\"moderator_note\")",
    );
    failed = true;
  } else {
    console.log(`OK:   ${communityEvidencePage} contains name="moderator_note"`);
  }

  // Ensure the old (wrong) field names are not present.
  if (src.includes('name="evidenceId"')) {
    console.error(
      `FAIL: ${communityEvidencePage} still uses deprecated name="evidenceId"; ` +
        'rename to name="evidence_id"',
    );
    failed = true;
  }
  if (src.includes('name="note"')) {
    console.error(
      `FAIL: ${communityEvidencePage} still uses deprecated name="note"; ` +
        'rename to name="moderator_note"',
    );
    failed = true;
  }
}

if (failed) {
  console.error("\nRoute check FAILED. See errors above.");
  process.exit(1);
} else {
  console.log("\nAll route checks passed.");
}