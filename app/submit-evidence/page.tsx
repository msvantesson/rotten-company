"use client";

import { useState } from "react";

export default function SubmitEvidencePage() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Submit Evidence</h1>

      <form
        action="/api/evidence/submit"
        method="POST"
        encType="multipart/form-data"
        onSubmit={() => setSubmitting(true)}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Entity Type
          </label>
          <select
            name="entityType"
            required
            className="border rounded p-2 w-full"
          >
            <option value="company">Company</option>
            <option value="leader">Leader</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Entity ID
          </label>
          <input
            type="text"
            name="entityId"
            required
            className="border rounded p-2 w-full"
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            name="title"
            required
            className="border rounded p-2 w-full"
            placeholder="Short description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Category
          </label>
          <input
            type="text"
            name="category"
            required
            className="border rounded p-2 w-full"
            placeholder="general"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            File (optional)
          </label>
          <input
            type="file"
            name="file"
            className="border rounded p-2 w-full"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Evidence"}
        </button>
      </form>
    </div>
  );
}
