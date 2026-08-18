import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const pagePath = "/home/runner/work/rotten-company/rotten-company/app/page.tsx";

describe("Homepage UI updates", () => {
  it("uses 5 movers per direction", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("const MAX_MOVERS_PER_DIRECTION = 5;");
    expect(source).toContain("increases.length < MAX_MOVERS_PER_DIRECTION");
    expect(source).toContain("decreases.length < MAX_MOVERS_PER_DIRECTION");
    expect(source).not.toContain("increases.length < 3");
    expect(source).not.toContain("decreases.length < 3");
  });

  it("renders Rotten Score cell without inline weekly delta text", () => {
    const source = readFileSync(pagePath, "utf8");

    expect(source).toContain("{company.rotten_score.toFixed(1)}</td>");
    expect(source).not.toContain('{delta >= 0 ? "↑" : "↓"} {formatDelta(delta)} this week');
  });
});
