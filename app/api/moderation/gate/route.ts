import { NextResponse } from "next/server";
import { getModerationGateStatus } from "@/lib/moderation-guards";

export async function GET() {
  const status = await getModerationGateStatus();
  return NextResponse.json(status);
}
