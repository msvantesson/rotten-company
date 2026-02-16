import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "4rem auto",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Thank you!
      </h1>

      <p style={{ marginBottom: "1rem", color: "#555" }}>
        Your company submission is now pending moderator review.
      </p>

      <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "#666" }}>
        You can view the status of your submission and all your previous
        submissions on the{" "}
        <Link
          href="/my-company-submissions"
          style={{ color: "black", textDecoration: "underline" }}
        >
          My Company Submissions
        </Link>{" "}
        page.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link
          href="/my-company-submissions"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "black",
            color: "white",
            borderRadius: "4px",
            textDecoration: "none",
          }}
        >
          View My Submissions
        </Link>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            border: "1px solid #ddd",
            color: "black",
            borderRadius: "4px",
            textDecoration: "none",
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
