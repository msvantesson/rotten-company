import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { submitCompany } from "./actions";
import { cookies } from "next/headers";

const COUNTRIES = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
];

export default async function SubmitCompanyPage() {
  const cookieStore = await cookies();
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const error = cookieStore.get("submit_company_error")?.value;

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "4rem auto",
        padding: "2rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
        Submit a Company
      </h1>

      <p style={{ marginBottom: "1.5rem" }}>
        Logged in as <strong>{user.email}</strong>
      </p>

      {error && (
        <div
          style={{
            background: "#ffe6e6",
            border: "1px solid #ffb3b3",
            padding: "0.75rem",
            borderRadius: "4px",
            marginBottom: "1rem",
            color: "#b30000",
          }}
        >
          {error}
        </div>
      )}

      <form action={submitCompany} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem" }}>
            Company Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Carlsberg"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label htmlFor="country" style={{ display: "block", marginBottom: "0.5rem" }}>
            Country (Headquarters)
          </label>
          <select
            id="country"
            name="country"
            required
            defaultValue=""
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "white",
            }}
          >
            <option value="" disabled>
              Select country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="website" style={{ display: "block", marginBottom: "0.5rem" }}>
            Website (optional)
          </label>
          <input
            id="website"
            name="website"
            type="text"
            placeholder="https://example.com"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label htmlFor="description" style={{ display: "block", marginBottom: "0.5rem" }}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="Brief description of the company"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label htmlFor="why" style={{ display: "block", marginBottom: "0.5rem" }}>
            Why should this company be added?
          </label>
          <textarea
            id="why"
            name="why"
            rows={3}
            required
            placeholder="Explain why this company belongs in the database"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "black",
            color: "white",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Submit Company for Review
        </button>
      </form>
    </div>
  );
}
