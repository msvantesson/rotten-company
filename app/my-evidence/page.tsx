// app/my-evidence/[id]/page.tsx
import { supabaseRoute } from "@/lib/supabase-route";

export default async function TestPage({ params }: { params: { id: string } }) {
  console.info("[TEST PAGE] invoked for id:", params.id);

  const supabase = await supabaseRoute();
  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData?.user ?? null;

  return new Response(
    JSON.stringify({ ok: true, invokedId: params.id, authUser: authUser ? { id: authUser.id, email: authUser.email } : null }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}
