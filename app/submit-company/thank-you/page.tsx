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

      <p style={{ marginBottom: "1.5rem", color: "#555" }}>
        Your company submission is now pending moderator review.
      </p>

      <a href="/" style={{ color: "black", textDecoration: "underline" }}>
        Back to search
      </a>
    </div>
  );
}
