import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { submitCompany } from "./actions";
import { cookies } from "next/headers";
import PrivateEquitySection from "@/components/PrivateEquitySection";

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

        <div>
          <label htmlFor="industry" style={{ display: "block", marginBottom: "0.5rem" }}>
            Industry (optional)
          </label>
          <select
            id="industry"
            name="industry"
            defaultValue=""
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "white",
            }}
          >
            <option value="">Select industry</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Automotive">Automotive</option>
            <option value="Construction">Construction</option>
            <option value="Education">Education</option>
            <option value="Energy">Energy</option>
            <option value="Finance">Finance</option>
            <option value="Food & Beverage">Food &amp; Beverage</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Hospitality">Hospitality</option>
            <option value="IT & Software">IT &amp; Software</option>
            <option value="Logistics">Logistics</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Media">Media</option>
            <option value="Pharmaceutical">Pharmaceutical</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Retail">Retail</option>
            <option value="Telecommunications">Telecommunications</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="size_employees" style={{ display: "block", marginBottom: "0.5rem" }}>
            Number of Employees (optional)
          </label>
          <select
            id="size_employees"
            name="size_employees"
            defaultValue=""
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "white",
            }}
          >
            <option value="">Select range</option>
            <option value="0–50">0–50</option>
            <option value="51–200">51–200</option>
            <option value="201–500">201–500</option>
            <option value="501–1,000">501–1,000</option>
            <option value="1,001–5,000">1,001–5,000</option>
            <option value="5,001–10,000">5,001–10,000</option>
            <option value="10,000+">10,000+</option>
          </select>
        </div>

        <PrivateEquitySection />

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
