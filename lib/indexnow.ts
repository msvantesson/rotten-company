const HOST = "rotten-company.com";
const KEY = "0240e80f992d4488b455f8346d5f478f";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const ALLOWED_PREFIX = `https://${HOST}/`;

/**
 * Build the canonical Rotten Company URL for a company slug.
 */
export function companyIndexNowUrl(slug: string): string {
  return `https://${HOST}/company/${slug}`;
}

/**
 * Submit one or more Rotten Company URLs to IndexNow.
 *
 * - Deduplicates URLs.
 * - Silently drops any URL that does not begin with https://rotten-company.com/.
 * - Never throws; IndexNow failures are logged and swallowed so the calling
 *   operation is never disrupted.
 */
export async function notifyIndexNow(urls: string | string[]): Promise<void> {
  const raw = Array.isArray(urls) ? urls : [urls];

  // Deduplicate and filter to allowed origin only
  const urlList = [...new Set(raw)].filter((u) => u.startsWith(ALLOWED_PREFIX));

  if (urlList.length === 0) return;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList,
      }),
    });

    if (!res.ok) {
      console.warn(`[indexnow] submission failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("[indexnow] submission error (ignored):", err);
  }
}
