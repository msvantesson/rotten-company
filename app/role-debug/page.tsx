import { supabaseServer } from "@/lib/supabase-server";

export default async function RoleDebugPage() {
  const supabase = await supabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = session?.user ? "authenticated" : "anonymous";

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Role Debug</h1>

      <p>
        <strong>Role:</strong> {role}
      </p>

      {session?.user && (
        <>
          <p>
            <strong>Email:</strong> {session.user.email}
          </p>
          <p>
            <strong>User ID:</strong> {session.user.id}
          </p>
        </>
      )}
    </div>
  );
}
