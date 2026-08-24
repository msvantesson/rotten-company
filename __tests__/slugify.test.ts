import { describe, expect, it } from "vitest";
import { slugify } from "../lib/slugify";

describe("slugify", () => {
  it.each([
    ["Nestlé", "nestle"],
    ["Société Générale", "societe-generale"],
    ["Müller", "muller"],
    ["Ørsted", "orsted"],
    ["Æon", "aeon"],
    ["Þór", "thor"],
    ["Ðelta", "delta"],
    ["Łódź", "lodz"],
    ["Straße", "strasse"],
    ["Acme Corp", "acme-corp"],
    ["  Leading & Trailing  ", "leading-trailing"],
    ['O\'Reilly', "oreilly"],
  ])("slugify(%s) → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
