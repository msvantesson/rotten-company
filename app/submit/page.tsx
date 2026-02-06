import Link from "next/link";

export default function SubmitGuardPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-semibold">
        Evidence must be tied to a company
      </h1>

      <p className="text-gray-700">
        Rotten Company is evidence‑first and entity‑anchored. Evidence must be
        submitted from a specific company page or through the Rotten Index.
      </p>

      <div className="flex gap-4">
        <Link
          href="/rotten-index"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Browse the Rotten Index
        </Link>

        <Link
          href="/"
          className="border px-4 py-2 rounded"
        >
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
