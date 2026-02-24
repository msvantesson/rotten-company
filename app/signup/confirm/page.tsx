import Link from "next/link";

export default async function SignupConfirmPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const emailParam = sp.email;
  const email =
    typeof emailParam === "string" && emailParam.trim().length > 0
      ? emailParam.trim()
      : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl bg-white border rounded-xl shadow-sm p-8 space-y-4">
        <h1 className="text-2xl font-bold">Confirm your email</h1>

        <p className="text-gray-700">
          We’ve sent a confirmation link to{` `}
          {email ? (
            <strong className="break-words">{email}</strong>
          ) : (
            "your email address"
          )}
          .
        </p>

        <p className="text-gray-700">
          Please open the email and click <strong>Confirm your mail</strong> to
          activate your account.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-flex justify-center bg-black text-white px-4 py-2 rounded font-medium hover:bg-gray-800 transition"
          >
            Go to login
          </Link>

          <Link
            href="/signup"
            className="inline-flex justify-center border px-4 py-2 rounded font-medium hover:bg-gray-50 transition"
          >
            Use a different email
          </Link>
        </div>

        <p className="text-xs text-gray-500 pt-2">
          Didn’t receive anything? Check spam/junk. If it still doesn’t arrive,
          try signing up again later.
        </p>
      </div>
    </main>
  );
}
