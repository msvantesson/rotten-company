"use client";

import { useState } from "react";
import CompanyPicker from "@/components/CompanyPicker";

export default function PrivateEquitySection() {
  const [peOwned, setPeOwned] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          id="pe_owned"
          name="pe_owned"
          value="true"
          checked={peOwned}
          onChange={(e) => setPeOwned(e.target.checked)}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label htmlFor="pe_owned" style={{ cursor: "pointer" }}>
          Owned by Private Equity
        </label>
      </div>

      {peOwned && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Private Equity Owner <span style={{ color: "#b30000" }}>*</span>
            </label>
            <CompanyPicker fieldName="pe_owner_id" />
          </div>

          <div>
            <label htmlFor="pe_ownership_start" style={{ display: "block", marginBottom: "0.5rem" }}>
              Ownership Start Date <span style={{ color: "#b30000" }}>*</span>
            </label>
            <input
              id="pe_ownership_start"
              name="pe_ownership_start"
              type="date"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label htmlFor="pe_ownership_end" style={{ display: "block", marginBottom: "0.5rem" }}>
              Ownership End Date{" "}
              <span style={{ fontSize: "0.8rem", color: "#666" }}>(optional – leave blank if current)</span>
            </label>
            <input
              id="pe_ownership_end"
              name="pe_ownership_end"
              type="date"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
