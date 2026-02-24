// app/signup/page.tsx

import { signupWithPassword } from "./actions";
import FormSubmitButton from "@/components/FormSubmitButton";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border rounded-xl shadow-sm p-8">
        {/* Left: Context */}
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-4">Join Rotten Company</h1>

          <p className="text-gray-700 mb-4">
            Rotten Company is an evidence‑based accountability platform
            documenting corporate misconduct and systemic harm.
          </p>

          <p className="text-gray-600 text-sm">
            Creating an account allows you to submit evidence, participate in
            moderation, and help keep the platform credible and transparent.
          </p>
        </div>

        {/* Right: Form */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Create your account</h2>

          <form action={signupWithPassword} className="flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
              autoComplete="email"
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
              autoComplete="new-password"
            />

            <FormSubmitButton
              idleText="Create account"
              pendingText="Creating account…"
              className="bg-black text-white p-3 rounded font-medium hover:bg-gray-800 transition"
            />
          </form>

          <p className="text-xs text-gray-500 mt-4">
            By signing up, you agree to participate in moderation when requested
            and to submit evidence responsibly.
          </p>
        </div>
      </div>
    </div>
  );
}
