import { sendRottenEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET() {
  await sendRottenEmail({
    recipient_email: "yourpersonal@email.com",
    subject: "Rotten test email",
    body: "This is a test email from Rotten Company. If you see this, SMTP is working.",
  });

  return NextResponse.json({ success: true });
}
