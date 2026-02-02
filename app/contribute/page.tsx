import Link from "next/link";

export default function ContributePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Contribute to Rotten Company</h1>
        <p className="text-sm text-neutral-600">
          Start by finding an existing company or requesting a new one.
        </p>
      </header>

      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Submit evidence</h2>
        <p className="text-sm text-neutral-600">
          If the company already exists, you can submit evidence directly.
        </p>
        <Link
          href="/contribute/find"
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Find an existing company
        </Link>
      </section>

      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">Request a new company</h2>
        <p className="text-sm text-neutral-600">
          If the company isn&apos;t listed yet, you can request it to be added.
        </p>
        <Link
          href="/company/request"
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Request a new company
        </Link>
      </section>
    </main>
  );
}
