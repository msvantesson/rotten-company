export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import pRetry from "p-retry";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  FROM_EMAIL,
  NOTIFICATION_WORKER_SECRET,
} = process.env;

const WORKER_NAME = "send-notifications";
const PROCESS_JOB_CONTEXT = "processJob";

function getRecipientLogValue(recipient: unknown) {
  const email = typeof recipient === "string" ? recipient.trim() : "";
  if (!email) return "unknown";

  const atIndex = email.indexOf("@");
  if (atIndex < 0) {
    return `${email.slice(0, 2)}***`;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const visibleLocal = local ? local.slice(0, 2) : "***";

  return `${visibleLocal}***@${domain}`;
}

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[send-notifications] startup: Missing Supabase env vars", {
    NEXT_PUBLIC_SUPABASE_URL: !!NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  });
}

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USERNAME || !SMTP_PASSWORD) {
  console.error("[send-notifications] startup: Missing SMTP env vars", {
    SMTP_HOST: !!SMTP_HOST,
    SMTP_PORT: !!SMTP_PORT,
    SMTP_USERNAME: !!SMTP_USERNAME,
    SMTP_PASSWORD: !!SMTP_PASSWORD,
  });
}

if (!NOTIFICATION_WORKER_SECRET) {
  console.error("[send-notifications] startup: Missing NOTIFICATION_WORKER_SECRET");
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

// --- Claim a pending job atomically ---
async function claimJob() {
  console.info("[send-notifications] claimJob: calling claim_notification_job RPC");
  const { data, error } = await supabase.rpc("claim_notification_job");
  if (error) {
    console.error("[send-notifications] claimJob: RPC error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }
  const job = Array.isArray(data) ? data[0] ?? null : data ?? null;
  if (!job) {
    console.info("[send-notifications] claimJob: no pending jobs available");
  } else {
    console.info("[send-notifications] claimJob: claimed job", { jobId: job.id, recipient: job.recipient_email });
  }
  return job;
}

// --- Mark job as sent ---
async function markSent(jobId: number) {
  const { error } = await supabase
    .from("notification_jobs")
    .update({
      status: "sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) {
    console.error("[send-notifications] markSent: failed to mark job sent", { jobId, error: error.message });
  }
}

// --- Mark job as failed ---
async function markFailed(jobId: number, err: any, attempts: number) {
  const { error } = await supabase
    .from("notification_jobs")
    .update({
      status: "failed",
      last_error: String(err).slice(0, 2000),
      attempts,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) {
    console.error("[send-notifications] markFailed: failed to mark job failed", { jobId, error: error.message });
  }
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
  console.info("[send-notifications] sendMail: calling transporter.sendMail", {
    jobId: job.id,
    to: job.recipient_email,
    subject: job.subject,
  });
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: job.recipient_email,
    subject: job.subject || "Notification",
    text: job.body || "",
  });
  console.info("[send-notifications] sendMail: succeeded", { jobId: job.id });
}

// --- Retry wrapper ---
async function sendEmailWithRetry(job: any) {
  const jobId: number = job.id;
  return pRetry(() => sendEmailOnce(job), {
    retries: 2,
    factor: 2,
    minTimeout: 1000,
    onFailedAttempt: (err) => {
      console.warn("[send-notifications] sendEmailWithRetry: attempt failed", {
        jobId,
        attempt: err.attemptNumber,
        retriesLeft: err.retriesLeft,
        error: err.error.message,
      });
    },
  });
}

// --- Core worker logic ---
async function processJob() {
  console.info("[send-notifications] processJob: entered");
  const job = await claimJob();
  if (!job) {
    return NextResponse.json({ ok: true, message: "no jobs" });
  }

  console.info("[send-notifications] processJob: sending email for job", { jobId: job.id });
  try {
    await sendEmailWithRetry(job);
    await markSent(job.id);
    console.info("[send-notifications] processJob: job completed successfully", { jobId: job.id });
    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (err) {
    console.error(`[${WORKER_NAME}] ${PROCESS_JOB_CONTEXT}: sendEmail failed after all retries`, {
      worker: WORKER_NAME,
      context: PROCESS_JOB_CONTEXT,
      jobId: job.id,
      recipientIdentifier: getRecipientLogValue(job.recipient_email),
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
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
  console.info("[send-notifications] GET: worker endpoint entered");
  const incoming = req.headers.get("x-worker-secret");

  if (incoming !== NOTIFICATION_WORKER_SECRET) {
    console.warn("[send-notifications] GET: authentication failed — secret mismatch");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  console.info("[send-notifications] GET: authentication accepted");
  return processJob();
}

export async function POST(req: Request) {
  console.info("[send-notifications] POST: worker endpoint entered");
  const incoming = req.headers.get("x-worker-secret");

  if (incoming !== NOTIFICATION_WORKER_SECRET) {
    console.warn("[send-notifications] POST: authentication failed — secret mismatch");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  console.info("[send-notifications] POST: authentication accepted");
  return processJob();
}
