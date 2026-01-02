// /app/login/page.tsx

import { loginWithPassword } from "./actions";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg bg-white shadow">
      <h1 className="text-2xl font-bold mb-6">Log in</h1>

      <form action={loginWithPassword} className="flex flex-col gap-4">
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
          Log in
        </button>
      </form>
    </div>
  );
}
