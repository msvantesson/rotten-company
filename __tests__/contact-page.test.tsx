import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ContactPage, { metadata } from "../app/contact/page";

describe("Contact page", () => {
  it("exports the expected metadata", () => {
    expect(metadata.title).toEqual({ absolute: "Contact Rotten Company" });
    expect(metadata.description).toContain("questions, corrections");
  });

  it("renders the required copy with a mailto link", () => {
    const html = renderToStaticMarkup(<ContactPage />);

    expect(html).toContain(
      "Rotten Company welcomes questions, corrections, source material, media enquiries, and other feedback."
    );
    expect(html).toContain(
      "If you believe information published on Rotten Company is inaccurate or incomplete, please contact us and include the company or evidence item concerned and any supporting documentation."
    );
    expect(html).toContain('href="mailto:contact@rotten-company.com"');
    expect(html).toContain("Email:");
    expect(html).toContain("contact@rotten-company.com");
  });
});
