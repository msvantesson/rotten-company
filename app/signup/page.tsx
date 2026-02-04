// app/signup/page.tsx

import { signupWithPassword } from "./actions";

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg bg-white shadow">
      <h1 className="text-2xl font-bold mb-6">Create account</h1>

      <form action={signupWithPassword} className="flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="border p-2 rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white p-2 rounded hover:bg-gray-800"
        >
          Sign up
        </button>
      </form>
    </div>
  );
}
