// app/api/dev/test-notification/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const service = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await service.from("notification_jobs").insert({
    recipient_email: "your-email@example.com",
    subject: "Test email from Rotten Company",
    body: `Hi,

This is a test email to verify the notification pipeline.

If rejected, you may submit a new request with additional context.

— Rotten Company`,
    metadata: { test: true },
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
