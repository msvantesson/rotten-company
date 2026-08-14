import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyIndexNow } from "../lib/indexnow";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const VALID_URL = "https://rotten-company.com/company/amazon";
const VALID_URL_2 = "https://rotten-company.com/company/google";

describe("notifyIndexNow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the correct IndexNow payload for a single URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await notifyIndexNow(VALID_URL);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(INDEXNOW_ENDPOINT);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.host).toBe("rotten-company.com");
    expect(body.key).toBe("0240e80f992d4488b455f8346d5f478f");
    expect(body.keyLocation).toBe("https://rotten-company.com/0240e80f992d4488b455f8346d5f478f.txt");
    expect(body.urlList).toEqual([VALID_URL]);
  });

  it("deduplicates URLs", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await notifyIndexNow([VALID_URL, VALID_URL, VALID_URL_2]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urlList).toEqual([VALID_URL, VALID_URL_2]);
  });

  it("ignores URLs that do not start with https://rotten-company.com/", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    await notifyIndexNow([
      "https://evil.com/steal",
      "http://rotten-company.com/company/foo",
      VALID_URL,
    ]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urlList).toEqual([VALID_URL]);
  });

  it("does not call fetch when all URLs are external", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await notifyIndexNow(["https://evil.com/bad", "http://rotten-company.com/company/foo"]);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not throw when IndexNow returns an HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 422 });
    vi.stubGlobal("fetch", mockFetch);

    await expect(notifyIndexNow(VALID_URL)).resolves.toBeUndefined();
  });

  it("does not throw when fetch rejects (network error)", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network failure"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(notifyIndexNow(VALID_URL)).resolves.toBeUndefined();
  });
});
