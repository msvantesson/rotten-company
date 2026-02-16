import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type CompanyRequest = {
  id: number;
  name: string;
  country: string;
  website: string | null;
  description: string;
  why: string;
  status: string;
  created_at: string;
  user_id: string;
};

export default async function MyCompanySubmissionsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: submissions, error } = await supabase
    .from("company_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[my-company-submissions] Error fetching submissions:", error);
  }

  const companyRequests = (submissions as CompanyRequest[]) ?? [];

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "4rem auto",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
        My Company Submissions
      </h1>

      <p style={{ marginBottom: "2rem", color: "#555", fontSize: "0.95rem" }}>
        Logged in as <strong>{user.email}</strong>
      </p>

      {companyRequests.length === 0 ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "2rem",
            textAlign: "center",
            color: "#666",
          }}
        >
          <p>You haven&apos;t submitted any companies yet.</p>
          <Link
            href="/submit-company"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              color: "black",
              textDecoration: "underline",
            }}
          >
            Submit a company
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {companyRequests.map((request) => (
            <div
              key={request.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1.5rem",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
                  {request.name}
                </h2>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    textTransform: "capitalize",
                    backgroundColor:
                      request.status === "pending"
                        ? "#fef3c7"
                        : request.status === "approved"
                          ? "#d1fae5"
                          : request.status === "rejected"
                            ? "#fee2e2"
                            : "#e5e7eb",
                    color:
                      request.status === "pending"
                        ? "#92400e"
                        : request.status === "approved"
                          ? "#065f46"
                          : request.status === "rejected"
                            ? "#991b1b"
                            : "#1f2937",
                  }}
                >
                  {request.status}
                </span>
              </div>

              <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                <div style={{ marginBottom: "0.25rem" }}>
                  <strong>Country:</strong> {request.country}
                </div>
                {request.website && (
                  <div style={{ marginBottom: "0.25rem" }}>
                    <strong>Website:</strong>{" "}
                    <a
                      href={request.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb", textDecoration: "underline" }}
                    >
                      {request.website}
                    </a>
                  </div>
                )}
                <div style={{ marginBottom: "0.25rem" }}>
                  <strong>Submitted:</strong>{" "}
                  {new Date(request.created_at).toLocaleDateString()} at{" "}
                  {new Date(request.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#444",
                  borderTop: "1px solid #eee",
                  paddingTop: "1rem",
                }}
              >
                <div style={{ marginBottom: "0.75rem" }}>
                  <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                    Description:
                  </strong>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {request.description}
                  </p>
                </div>
                <div>
                  <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                    Why this company:
                  </strong>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{request.why}</p>
                </div>
              </div>

              {request.status === "pending" && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    color: "#666",
                  }}
                >
                  <strong>Note:</strong> Your submission is awaiting moderation by
                  other moderators. You cannot moderate your own submissions.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #ddd" }}>
        <Link href="/submit-company" style={{ color: "black", marginRight: "2rem" }}>
          Submit another company
        </Link>
        <Link href="/" style={{ color: "#666" }}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
