import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SMTP_HOST: process.env.SMTP_HOST || "(missing)",
    SMTP_PORT: process.env.SMTP_PORT || "(missing)",
    SMTP_USERNAME: process.env.SMTP_USERNAME || "(missing)",
  });
}
