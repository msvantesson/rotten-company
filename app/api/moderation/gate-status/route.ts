import { NextResponse } from "next/server";
import { getModerationGateStatus } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const gate = await getModerationGateStatus();
  return NextResponse.json(gate, { status: 200 });
}
