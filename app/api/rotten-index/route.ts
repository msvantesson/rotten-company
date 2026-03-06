// app/api/rotten-index/route.ts
import { NextResponse } from "next/server";
import { getRottenIndexData } from "@/lib/getRottenIndexData";

function getSearchParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const result = await getRottenIndexData({
    type: getSearchParam(url, "type") === "leader" ? "leader" : "company",
    limit: Number(getSearchParam(url, "limit") || "10"),
    country: getSearchParam(url, "country"),
    q: getSearchParam(url, "q"),
    sort: getSearchParam(url, "sort"),
    dir: getSearchParam(url, "dir"),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ rows: result.rows }, { status: 200 });
}
