export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import pRetry from "p-retry";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  FROM_EMAIL,
  NOTIFICATION_WORKER_SECRET,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars");
}

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USERNAME || !SMTP_PASSWORD) {
  console.error("Missing SMTP env vars");
}

if (!NOTIFICATION_WORKER_SECRET) {
  console.error("Missing NOTIFICATION_WORKER_SECRET");
}

const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

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

// --- SMTP transporter ---
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  },
});

// --- Send email once ---
async function sendEmailOnce(job: any) {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: job.recipient_email,
    subject: job.subject || "Notification",
    text: job.body || "",
  });
}

// --- Retry wrapper ---
async function sendEmailWithRetry(job: any) {
  return pRetry(() => sendEmailOnce(job), {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
  });
}

// --- Core worker logic ---
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
    return NextResponse.json(
      { ok: false, error: "send_failed", jobId: job.id },
      { status: 500 }
    );
  }
}

// --- Authenticated entrypoints ---
export async function GET(req: Request) {
  const incoming = req.headers.get("x-worker-secret");

  if (incoming !== NOTIFICATION_WORKER_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return processJob();
}

export async function POST(req: Request) {
  const incoming = req.headers.get("x-worker-secret");

  if (incoming !== NOTIFICATION_WORKER_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return processJob();
}
