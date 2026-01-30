// app/api/rotten-index/route.ts
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type IndexType = "company" | "leader" | "owner";

function getSearchParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = (getSearchParam(url, "type") as IndexType) || "company";
    const limit = Number(getSearchParam(url, "limit") || "10");
    const country = getSearchParam(url, "country");

    let rows: {
      id: number;
      name: string;
      slug: string;
      country: string | null;
      rotten_score: number;
    }[] = [];

    if (type === "company") {
      const result = await sql<{
        id: number;
        name: string;
        slug: string;
        country: string | null;
        rotten_score: number;
      }>`
        SELECT
          id,
          name,
          slug,
          country,
          rotten_score
        FROM companies
        WHERE (${country} IS NULL OR country = ${country})
        ORDER BY rotten_score DESC NULLS LAST, id ASC
        LIMIT ${limit};
      `;
      rows = result.rows;
    } else if (type === "leader") {
      const result = await sql<{
        id: number;
        name: string;
        slug: string;
        country: string | null;
        rotten_score: number;
      }>`
        SELECT
          id,
          name,
          slug,
          country,
          rotten_score
        FROM leaders
        WHERE (${country} IS NULL OR country = ${country})
        ORDER BY rotten_score DESC NULLS LAST, id ASC
        LIMIT ${limit};
      `;
      rows = result.rows;
    } else if (type === "owner") {
      const result = await sql<{
        id: number;
        name: string;
        slug: string;
        country: string | null;
        rotten_score: number;
      }>`
        SELECT
          id,
          name,
          slug,
          NULL::text AS country,
          rotten_score
        FROM owners_investors
        WHERE (${country} IS NULL) -- owners don't have country yet
        ORDER BY rotten_score DESC NULLS LAST, id ASC
        LIMIT ${limit};
      `;
      rows = result.rows;
    } else {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err) {
    console.error("Error in /api/rotten-index:", err);
    return NextResponse.json(
      { error: "Failed to load Rotten Index" },
      { status: 500 }
    );
  }
}
