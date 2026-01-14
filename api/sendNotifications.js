// api/sendNotifications.js
import { createClient } from "@supabase/supabase-js";
import sgMail from "@sendgrid/mail";
import pRetry from "p-retry";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SENDGRID_API_KEY,
  FROM_EMAIL = "no-reply@yourdomain.com"
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SENDGRID_API_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Calls the claim_notification_job RPC which should atomically claim one pending job.
 * Adjust return handling if your RPC returns a single object instead of an array.
 */
async function claimJob() {
  const { data, error } = await supabase.rpc("claim_notification_job");
  if (error) {
    console.error("claim_notification_job rpc error:", error);
    return null;
  }
  // RPC may return an array or single object depending on implementation
  if (!data) return null;
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function markSent(jobId) {
  await supabase
    .from("notification_jobs")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

async function markFailed(jobId, errMessage, attempts = 1) {
  await supabase
    .from("notification_jobs")
    .update({
      status: "failed",
      last_error: String(errMessage).slice(0, 2000),
      attempts,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId);
}

async function sendEmailOnce(job) {
  const msg = {
    to: job.recipient_email,
    from: FROM_EMAIL,
    subject: job.subject || "Notification",
    text: job.body || "",
    // html: job.html_body || undefined
  };
  await sgMail.send(msg);
}

/**
 * Wrap sendEmailOnce with p-retry so transient SendGrid/network errors are retried.
 * Adjust retries and factor as needed.
 */
async function sendEmailWithRetry(job) {
  return pRetry(() => sendEmailOnce(job), {
    retries: 2, // total attempts = retries + 1
    factor: 2,
    minTimeout: 1000
  });
}

export default async function handler(req, res) {
  try {
    // Allow GET for quick manual testing and POST for cron/webhooks
    if (req.method !== "POST" && req.method !== "GET") {
      res.status(405).send("Method not allowed");
      return;
    }

    const job = await claimJob();
    if (!job) {
      res.status(200).json({ ok: true, message: "no jobs" });
      return;
    }

    try {
      await sendEmailWithRetry(job);
      await markSent(job.id);
      console.info("Sent notification job", job.id, job.recipient_email);
      res.status(200).json({ ok: true, jobId: job.id });
    } catch (sendErr) {
      console.error("sendEmail error for job", job.id, sendErr);
      const attempts = (job.attempts || 0) + 1;
      await markFailed(job.id, sendErr, attempts);
      res.status(500).json({ ok: false, error: "send_failed", jobId: job.id });
    }
  } catch (err) {
    console.error("handler error", err);
    res.status(500).json({ ok: false, error: "internal" });
  }
}
