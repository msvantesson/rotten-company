import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";
import pRetry from "p-retry";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SENDGRID_API_KEY,
  FROM_EMAIL = "no-reply@yourdomain.com"
} = process.env;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
sgMail.setApiKey(SENDGRID_API_KEY!);

async function claimJob() {
  const { data, error } = await supabase.rpc("claim_notification_job");
  if (error) return null;
  return Array.isArray(data) ? data[0] : data;
}

async function markSent(id: number) {
  await supabase.from("notification_jobs").update({
    status: "sent",
    updated_at: new Date().toISOString()
  }).eq("id", id);
}

async function markFailed(id: number, err: any, attempts: number) {
  await supabase.from("notification_jobs").update({
    status: "failed",
    last_error: String(err).slice(0, 2000),
    attempts,
    updated_at: new Date().toISOString()
  }).eq("id", id);
}

async function sendEmailOnce(job: any) {
  await sgMail.send({
    to: job.recipient_email,
    from: FROM_EMAIL,
    subject: job.subject,
    text: job.body
  });
}

async function sendEmailWithRetry(job: any) {
  return pRetry(() => sendEmailOnce(job), { retries: 2 });
}

export async function GET() {
  const job = await claimJob();
  if (!job) return NextResponse.json({ ok: true, message: "no jobs" });

  try {
    await sendEmailWithRetry(job);
    await markSent(job.id);
    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (err) {
    const attempts = (job.attempts || 0) + 1;
    await markFailed(job.id, err, attempts);
    return NextResponse.json({ ok: false, error: "send_failed", jobId: job.id });
  }
}

export const POST = GET;
