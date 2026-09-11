"use client";

import { useRef, useState } from "react";

type RatingStarsProps = {
  companySlug: string;
  categorySlug: string;
  initialScore?: number | null; // user's existing rating if any
};

export default function RatingStars({
  companySlug,
  categorySlug,
  initialScore = null,
}: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(initialScore);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function submitRating(score: number) {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/submit-rating", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companySlug,
          categorySlug,
          score,
        }),
      });

      const text = await res.text();
      let data: { error?: string } | null = null;

      if (text) {
        try {
          data = JSON.parse(text) as { error?: string };
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const isUnauthenticated =
          res.status === 401 || data?.error === "Failed to load user";
        const fallbackMessage =
          res.status >= 500 ? "Something went wrong" : "Unable to save rating";
        setMessage(
          isUnauthenticated
            ? "Please register or log in to rate companies."
            : data?.error || fallbackMessage
        );
      } else {
        setSelected(score);
        setMessage("Rating saved");
      }
    } catch {
      setMessage("Network error");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = hovered ? star <= hovered : star <= (selected || 0);

          return (
            <button
              key={star}
              disabled={loading}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => submitRating(star)}
              className={`text-2xl transition ${
                active ? "text-yellow-400" : "text-gray-400"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-gray-500">Saving…</p>}
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
