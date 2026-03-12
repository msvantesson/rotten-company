// supabase/functions/refresh_scoring_if_dirty/index.ts
// Supabase Edge Function: calls public.refresh_scoring_if_dirty() via RPC.
// Protected by the Supabase service-role JWT (Authorization: Bearer <service_role_key>).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  // Protect the function: only allow requests that supply the service role key
  // as a Bearer token, or an explicit EDGE_FUNCTION_SECRET env var.
  const edgeFunctionSecret = Deno.env.get("EDGE_FUNCTION_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const expectedToken = edgeFunctionSecret || SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedToken || token !== expectedToken) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "missing_supabase_env_vars" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase.rpc("refresh_scoring_if_dirty");

  if (error) {
    console.error("[refresh_scoring_if_dirty] RPC error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, ran: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
