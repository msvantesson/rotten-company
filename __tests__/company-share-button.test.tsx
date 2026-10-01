import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: <T,>(initial: T) => [
      mockState.value === undefined ? initial : (mockState.value as T),
      (value: T) => {
        mockState.value = value;
      },
    ] as const,
  };
});

import CompanyShareButton, {
  buildCompanyShareContent,
} from "../components/CompanyShareButton";

const props = {
  companyName: "Acme Ltd",
  score: 42,
  evidenceCount: 2,
  url: "https://rotten-company.com/company/acme",
};

function getButton() {
  const tree = CompanyShareButton(props);
  const children = tree.props.children as React.ReactElement[];
  return children[0].props as { onClick: () => Promise<void> };
}

describe("CompanyShareButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockState.value = undefined;
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("builds the expected native share title, text, and canonical URL", () => {
    expect(buildCompanyShareContent("Acme Ltd", 42, 2, props.url)).toEqual({
      title: "Acme Ltd Rotten Score: 42/100",
      text: "Acme Ltd has a Rotten Score of 42/100 based on 2 approved evidence records.",
      url: props.url,
    });
  });

  it("uses singular wording for one evidence record", () => {
    expect(buildCompanyShareContent("Acme Ltd", 42, 1, props.url).text).toBe(
      "Acme Ltd has a Rotten Score of 42/100 based on 1 approved evidence record.",
    );
  });

  it("uses native sharing when the Web Share API is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });

    await getButton().onClick();

    expect(share).toHaveBeenCalledWith({
      title: "Acme Ltd Rotten Score: 42/100",
      text: "Acme Ltd has a Rotten Score of 42/100 based on 2 approved evidence records.",
      url: props.url,
    });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies the canonical URL when native sharing is unavailable and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await getButton().onClick();

    expect(writeText).toHaveBeenCalledWith(props.url);
    const copiedTree = CompanyShareButton(props);
    expect(copiedTree.props.children[1].props.children).toBe("Link copied");
  });

  it("does not show an error or copy after native sharing is cancelled", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    await getButton().onClick();

    expect(writeText).not.toHaveBeenCalled();
    expect(CompanyShareButton(props).props.children[1]).toBe(false);
  });

  it("exposes the canonical URL for manual copying if native sharing and clipboard fail", async () => {
    const share = vi.fn().mockRejectedValue(new Error("Unavailable"));
    const writeText = vi.fn().mockRejectedValue(new Error("Unavailable"));
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    await getButton().onClick();

    const manualTree = CompanyShareButton(props);
    expect(manualTree.props.children[2].props.children[0].props.children).toContain(
      "Select and copy this URL.",
    );
    expect(manualTree.props.children[2].props.children[1].props.value).toBe(props.url);
  });
});
