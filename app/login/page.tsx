import { cookies } from "next/headers";
import Link from "next/link";
import { loginWithPassword } from "./actions";
import FormSubmitButton from "@/components/FormSubmitButton";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const loginError = cookieStore.get("login_error")?.value ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6">Sign in</h1>

        <form action={loginWithPassword} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            required
            className="border border-border bg-surface text-foreground p-3 rounded focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="email"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="border border-border bg-surface text-foreground p-3 rounded focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="current-password"
          />

          {loginError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {loginError}
            </div>
          )}

          <FormSubmitButton
            idleText="Sign in"
            pendingText="Signing in…"
            className="bg-black text-white p-3 rounded font-medium hover:bg-gray-800 transition"
          />
        </form>

        <p className="text-sm text-muted-foreground mt-4">
          <Link href="/forgot-password" className="underline hover:text-foreground">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}