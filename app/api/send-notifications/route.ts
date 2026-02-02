export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";
import pRetry from "p-retry";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SENDGRID_API_KEY,
  FROM_EMAIL = "no-reply@yourdomain.com",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SENDGRID_API_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY"
  );
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
sgMail.setApiKey(SENDGRID_API_KEY!);

// --- Claim a pending job atomically ---
async function claimJob() {
  const { data, error } = await supabase.rpc("claim_notification_job");
  if (error) {
    console.error("claim_notification_job RPC error:", error);
    return null;
  }
  if (!data) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
}

// --- Mark job as sent ---
async function markSent(jobId: number) {
  await supabase
    .from("notification_jobs")
    .update({
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// --- Mark job as failed ---
async function markFailed(jobId: number, err: any, attempts: number) {
  await supabase
    .from("notification_jobs")
    .update({
      status: "failed",
      last_error: String(err).slice(0, 2000),
      attempts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// --- Send email once ---
async function sendEmailOnce(job: any) {
  const msg = {
    to: job.recipient_email,
    from: FROM_EMAIL,
    subject: job.subject || "Notification",
    text: job.body || "",
  };

  await sgMail.send(msg);
}

// --- Retry wrapper ---
async function sendEmailWithRetry(job: any) {
  return pRetry(() => sendEmailOnce(job), {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
  });
}

// --- Shared handler for GET + POST ---
async function processJob() {
  const job = await claimJob();
  if (!job) {
    return NextResponse.json({ ok: true, message: "no jobs" });
  }

  try {
    await sendEmailWithRetry(job);
    await markSent(job.id);
    console.info("Sent notification job", job.id, job.recipient_email);
    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (err) {
    console.error("sendEmail error for job", job.id, err);
    const attempts = (job.attempts || 0) + 1;
    await markFailed(job.id, err, attempts);
    return NextResponse.json({
      ok: false,
      error: "send_failed",
      jobId: job.id,
    });
  }
}

export async function GET() {
  return processJob();
}

export async function POST() {
  return processJob();
}
