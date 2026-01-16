// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";

export default async function TestPage({ params }: { params: { id: string } }) {
  console.info("[TEST PAGE] invoked for id:", params.id);

  const supabase = await supabaseRoute();
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;

  const payload = { ok: true, invokedId: params.id, authUser: authUser ? { id: authUser.id, email: authUser.email } : null };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Test Page</h1>
      <pre style={{ background: "#f5f5f5", padding: 12 }}>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}
