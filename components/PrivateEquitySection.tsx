"use client";

import { useState } from "react";
import CompanyPicker from "@/components/CompanyPicker";

type PeOption = "none" | "is_pe" | "pe_owned";

export default function PrivateEquitySection() {
  const [peOption, setPeOption] = useState<PeOption>("none");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Private Equity</p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="radio"
          id="pe_none"
          name="pe_option"
          value="none"
          checked={peOption === "none"}
          onChange={() => setPeOption("none")}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label htmlFor="pe_none" style={{ cursor: "pointer" }}>
          Not applicable
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="radio"
          id="pe_is_pe"
          name="pe_option"
          value="is_pe"
          checked={peOption === "is_pe"}
          onChange={() => setPeOption("is_pe")}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label htmlFor="pe_is_pe" style={{ cursor: "pointer" }}>
          This company is a Private Equity firm
        </label>
      </div>

      {/* Hidden inputs to submit derived values */}
      {peOption === "is_pe" && (
        <input type="hidden" name="is_private_equity" value="true" />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="radio"
          id="pe_owned"
          name="pe_option"
          value="pe_owned"
          checked={peOption === "pe_owned"}
          onChange={() => setPeOption("pe_owned")}
          style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
        />
        <label htmlFor="pe_owned" style={{ cursor: "pointer" }}>
          Owned by Private Equity
        </label>
      </div>

      {peOption === "pe_owned" && (
        <input type="hidden" name="pe_owned" value="true" />
      )}

      {peOption === "pe_owned" && (
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
