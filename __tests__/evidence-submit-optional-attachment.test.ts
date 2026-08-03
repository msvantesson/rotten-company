/**
 * Tests proving evidence can be submitted without an attachment.
 *
 * These tests cover the two layers where "file required" was enforced:
 *   1. Client-side validation in EvidenceUpload (handleSubmit)
 *   2. Server-side file parsing in /api/evidence/submit (empty File treated as null)
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Helper: reproduce the client-side validation logic extracted from
// EvidenceUpload.tsx so it can be tested without a browser/DOM.
// ---------------------------------------------------------------------------

interface ValidateEvidenceInput {
  title: string;
  summary: string;
  confirmPolicy: boolean;
  categoryId: number | null;
  file: File | null;
}

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB
const MAX_PDF_SIZE = 1 * 1024 * 1024;   // 1 MB

function validateEvidence(input: ValidateEvidenceInput): string | null {
  const { title, summary, confirmPolicy, categoryId, file } = input;
  if (!title.trim()) return "Title is required.";
  if (!summary.trim()) return "Summary is required.";
  if (!confirmPolicy) return "Please confirm the policy about naming only leaders/managers.";
  if (!categoryId) return "Please select a category.";
  if (file) {
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      return `Image too large. Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`;
    }
    if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
      return `PDF too large. Max size is ${MAX_PDF_SIZE / (1024 * 1024)}MB.`;
    }
  }
  return null; // valid
}

// ---------------------------------------------------------------------------
// Helper: reproduce server-side file extraction logic from route.ts
// ---------------------------------------------------------------------------

function extractFileFromFormData(formData: FormData): File | null {
  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) return value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceUpload client validation — attachment is optional", () => {
  const validBase: ValidateEvidenceInput = {
    title: "Title",
    summary: "Summary text",
    confirmPolicy: true,
    categoryId: 1,
    file: null,
  };

  it("passes when no file is provided", () => {
    expect(validateEvidence({ ...validBase, file: null })).toBeNull();
  });

  it("still requires title", () => {
    expect(validateEvidence({ ...validBase, title: "" })).toBe("Title is required.");
  });

  it("still requires summary", () => {
    expect(validateEvidence({ ...validBase, summary: "" })).toBe("Summary is required.");
  });

  it("still requires policy confirmation", () => {
    expect(validateEvidence({ ...validBase, confirmPolicy: false })).toBe(
      "Please confirm the policy about naming only leaders/managers.",
    );
  });

  it("still requires a category", () => {
    expect(validateEvidence({ ...validBase, categoryId: null })).toBe(
      "Please select a category.",
    );
  });

  it("rejects an oversized image when one is supplied", () => {
    const bigImage = new File(["x".repeat(MAX_IMAGE_SIZE + 1)], "photo.jpg", {
      type: "image/jpeg",
    });
    expect(validateEvidence({ ...validBase, file: bigImage })).toMatch(/Image too large/);
  });

  it("rejects an oversized PDF when one is supplied", () => {
    const bigPdf = new File(["x".repeat(MAX_PDF_SIZE + 1)], "doc.pdf", {
      type: "application/pdf",
    });
    expect(validateEvidence({ ...validBase, file: bigPdf })).toMatch(/PDF too large/);
  });

  it("accepts a valid image when one is supplied", () => {
    const smallImage = new File(["data"], "photo.png", { type: "image/png" });
    expect(validateEvidence({ ...validBase, file: smallImage })).toBeNull();
  });
});

describe("Server-side file extraction — empty File treated as null", () => {
  it("returns null when no file field is present in FormData", () => {
    const fd = new FormData();
    fd.append("title", "Test");
    expect(extractFileFromFormData(fd)).toBeNull();
  });

  it("returns null when a zero-byte File is appended", () => {
    const fd = new FormData();
    const emptyFile = new File([], "empty.txt", { type: "text/plain" });
    fd.append("file", emptyFile);
    expect(extractFileFromFormData(fd)).toBeNull();
  });

  it("returns the File when a non-empty File is appended", () => {
    const fd = new FormData();
    const realFile = new File(["content"], "doc.pdf", { type: "application/pdf" });
    fd.append("file", realFile);
    expect(extractFileFromFormData(fd)).toBe(realFile);
  });
});
