// app/api/dev/test-notification/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "../../../lib/supabaseService";

export async function POST() {
  const service = supabaseService();

  await service.from("notification_jobs").insert({
    recipient_email: "svante01@yahoo.com",
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
