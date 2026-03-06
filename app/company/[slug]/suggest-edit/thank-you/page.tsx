import Link from "next/link";

export default async function SuggestEditThankYouPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  const slug = resolved.slug;

  return (
    <main className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
      <h1 className="text-3xl font-semibold">Thanks for your suggestion!</h1>
      <p className="text-gray-600">
        Your edit suggestion has been submitted and is pending review by a moderator.
      </p>
      <Link
        href={`/company/${slug}`}
        className="inline-block mt-4 text-sm text-blue-700 hover:underline"
      >
        ← Back to company page
      </Link>
    </main>
  );
}
