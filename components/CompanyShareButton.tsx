"use client";

import { useState } from "react";

type CompanyShareButtonProps = {
  companyName: string;
  score: number;
  evidenceCount: number;
  url: string;
};

type CompanyShareContent = {
  title: string;
  text: string;
  url: string;
};

export function buildCompanyShareContent(
  companyName: string,
  score: number,
  evidenceCount: number,
  url: string,
): CompanyShareContent {
  const evidenceLabel = evidenceCount === 1 ? "evidence record" : "evidence records";

  return {
    title: `${companyName} Rotten Score: ${score}/100`,
    text: `${companyName} has a Rotten Score of ${score}/100 based on ${evidenceCount} approved ${evidenceLabel}.`,
    url,
  };
}

export default function CompanyShareButton({
  companyName,
  score,
  evidenceCount,
  url,
}: CompanyShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");

  async function handleShare() {
    setStatus("idle");
    const content = buildCompanyShareContent(companyName, score, evidenceCount, url);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(content);
        return;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        aria-label={`Share ${companyName} Rotten Score`}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Share
      </button>
      {status === "copied" && (
        <p role="status" className="text-sm text-muted-foreground">
          Link copied
        </p>
      )}
      {status === "manual" && (
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-sm text-muted-foreground">
            Automatic sharing failed. Select and copy this URL.
          </p>
          <input
            id="company-share-url"
            type="text"
            readOnly
            value={url}
            aria-label="Company page URL"
            onFocus={(event) => event.currentTarget.select()}
            className="max-w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
        </div>
      )}
    </div>
  );
}
