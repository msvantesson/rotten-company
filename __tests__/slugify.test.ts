import { describe, expect, it } from "vitest";
import { slugify } from "../lib/slugify";

describe("slugify", () => {
  it.each([
    ["Nestlé", "nestle"],
    ["Å Energi AS", "a-energi-as"],
    ["A.P. Møller - Mærsk A/S", "a-p-moller-maersk-a-s"],
    ["Deutsche Börse AG", "deutsche-borse-ag"],
    ["Flughafen Zürich AG", "flughafen-zurich-ag"],
    ["Ørsted A/S", "orsted-a-s"],
    ["Škoda Auto a.s.", "skoda-auto-a-s"],
    ["Telefónica, S.A.", "telefonica-s-a"],
    ["Żabka Polska sp. z o.o.", "zabka-polska-sp-z-o-o"],
    ["ŽĎAS, a.s.", "zdas-a-s"],
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

  it("keeps the automatic Maersk slug separate from a later explicit canonical override", () => {
    expect(slugify("A.P. Møller - Mærsk A/S")).toBe("a-p-moller-maersk-a-s");
    expect(slugify("A.P. Møller - Mærsk A/S")).not.toBe("ap-moller-maersk");
  });
});
