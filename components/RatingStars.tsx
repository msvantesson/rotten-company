"use client";

import { useState } from "react";

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

  async function submitRating(score: number) {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/submit-rating", {
        method: "POST",
        body: JSON.stringify({
          companySlug,
          categorySlug,
          score,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
      } else {
        setSelected(score);
        setMessage("Rating saved");
      }
    } catch {
      setMessage("Network error");
    }

    setLoading(false);
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
