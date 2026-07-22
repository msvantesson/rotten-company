#!/usr/bin/env node
/**
 * Regression guard: ensure no runtime UI code hardcodes category display names.
 *
 * The `categories.name` column in the database is the sole source of truth for
 * all user-facing category labels. Hardcoding these names in runtime code would
 * cause them to drift when a category is renamed in the DB.
 *
 * This script fails (exit 1) if any of the known production category display
 * names are found in runtime source files (app/, components/, lib/).
 *
 * Allowlist:
 *   - supabase/              — migrations, seeds, DB scripts
 *   - docs/                  — documentation
 *   - scripts/               — this script itself and other tooling
 *   - Any *.test.* or *.spec.* files
 *   - Any path containing __tests__ or __mocks__
 *
 * Run via: node scripts/check-category-names.mjs
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

// ─── Production category display names ─────────────────────────────────────
// Keep this list in sync with `categories.name` values in the database.
// To rename a category: update the DB, then update this list.
const CATEGORY_DISPLAY_NAMES = [
  "Corporate Misconduct",
  "Human Rights & Exploitation",
  "Fraud & Corruption",
  "Deceptive Practices",
  "Environmental Harm",
  "Sustainability Deception",
  "Workplace Misconduct",
  "Financial Misconduct",
];

// ─── Directories to scan (runtime code only) ───────────────────────────────
const SCAN_DIRS = ["app", "components", "lib"];

// ─── File extensions to check ──────────────────────────────────────────────
const CHECK_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

// ─── Path patterns to skip (allowlisted) ───────────────────────────────────
function isAllowlisted(filePath) {
  if (filePath.includes("__tests__")) return true;
  if (filePath.includes("__mocks__")) return true;
  // Allow test/spec files anywhere
  const base = filePath.replace(/\\/g, "/");
  if (/\.(test|spec)\.[tj]sx?$/.test(base)) return true;
  return false;
}

// ─── Walk directory tree ────────────────────────────────────────────────────
function walk(dir) {
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...walk(full));
      } else if (CHECK_EXTENSIONS.has(extname(entry))) {
        files.push(full);
      }
    } catch {
      // ignore stat errors
    }
  }
  return files;
}

// ─── Main check ─────────────────────────────────────────────────────────────
let failed = false;

for (const dir of SCAN_DIRS) {
  const files = walk(dir);

  for (const file of files) {
    if (isAllowlisted(file)) continue;

    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    // Check line by line, skipping pure comment lines so that internal code
    // comments (e.g. "// Environmental Harm") don't trigger false positives.
    const lines = src.split("\n");
    const nonCommentSrc = lines
      .filter((line) => {
        const trimmed = line.trimStart();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*");
      })
      .join("\n");

    for (const name of CATEGORY_DISPLAY_NAMES) {
      if (nonCommentSrc.includes(name)) {
        console.error(
          `FAIL: hardcoded category display name "${name}" found in ${file}\n` +
            `      Category labels must come from the \`categories.name\` DB column.\n` +
            `      See docs/category-taxonomy.md for the rename workflow.`,
        );
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error(
    "\nCategory name check FAILED. Remove hardcoded display names from runtime code.",
  );
  process.exit(1);
} else {
  console.log(
    `OK:   No hardcoded category display names found in runtime code ` +
      `(checked ${SCAN_DIRS.join(", ")}).`,
  );
}
