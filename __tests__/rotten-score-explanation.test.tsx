import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import RottenScoreExplanation from "../components/RottenScoreExplanation";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("RottenScoreExplanation", () => {
  it("renders the compact homepage explanation and methodology link", () => {
    const html = renderToStaticMarkup(<RottenScoreExplanation variant="compact" />);

    expect(html).toContain("Scores run from 0 to 100.");
    expect(html).toContain("Higher means more documented harm.");
    expect(html).toContain("Calculated from approved evidence, weighted by severity.");
    expect(html).toContain('href="/rotten-score"');
    expect(html).toContain("How scoring works →");
  });

  it("renders the approved evidence count with singular and plural wording", () => {
    const singular = renderToStaticMarkup(
      <RottenScoreExplanation variant="company" evidenceCount={1} score={20} />,
    );
    const plural = renderToStaticMarkup(
      <RottenScoreExplanation variant="company" evidenceCount={2} score={20} />,
    );

    expect(singular).toContain("Based on 1 approved evidence record.");
    expect(plural).toContain("Based on 2 approved evidence records.");
    expect(singular).toContain("A higher score means more documented harm.");
  });

  it("clarifies that a zero score is not proof that no harm occurred", () => {
    const html = renderToStaticMarkup(
      <RottenScoreExplanation variant="company" evidenceCount={0} score={0} />,
    );

    expect(html).toContain(
      "No approved evidence of harm is currently recorded. This does not prove that no harm occurred.",
    );
    expect(html).toContain('href="/rotten-score"');
  });
});
