import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "geist-sans" }),
  Geist_Mono: () => ({ variable: "geist-mono" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { toString(): string };
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={typeof href === "string" ? href : href.toString()} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

vi.mock("@/components/SiteHeader", () => ({
  default: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
}));

vi.mock("@/components/NavMenu", () => ({
  default: () => <nav>Navigation</nav>,
}));

vi.mock("@/lib/seo", () => ({
  SITE_ORIGIN: "https://rotten-company.com",
  canonicalUrl: (path: string) => `https://rotten-company.com${path}`,
}));

import RootLayout from "../app/layout";
import PrivacyPage, { metadata as privacyMetadata } from "../app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "../app/terms/page";

describe("Legal pages", () => {
  it("exports the expected privacy metadata and copy", () => {
    expect(privacyMetadata.title).toEqual({
      absolute: "Privacy Policy | Rotten Company",
    });
    expect(privacyMetadata.description).toBe(
      "Privacy information for users of Rotten Company."
    );

    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Supabase Auth");
    expect(html).toContain("Google sign-in");
    expect(html).toContain("Gmail");
    expect(html).toContain("contact@rotten-company.com");
  });

  it("exports the expected terms metadata and copy", () => {
    expect(termsMetadata.title).toEqual({
      absolute: "Terms of Service | Rotten Company",
    });
    expect(termsMetadata.description).toBe(
      "Terms governing use of Rotten Company."
    );

    const html = renderToStaticMarkup(<TermsPage />);

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Rotten Scores");
    expect(html).toContain("informational and public-interest platform");
    expect(html).toContain("not legal findings");
    expect(html).toContain("contact@rotten-company.com");
  });

  it("renders the shared footer links for legal and support pages", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>Child content</div>
      </RootLayout>
    );

    expect(html).toContain('href="/disclaimer"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/moderation-guidelines"');
    expect(html).toContain('href="/contact"');
  });
});
