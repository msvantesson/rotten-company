"use client";

import { useState } from "react";
import EvidenceUpload from "@/components/EvidenceUpload";


export default function TestUploadPage() {
  const [entityId, setEntityId] = useState<number>(1);
  const [entityType, setEntityType] = useState<"company" | "leader" | "manager" | "owner">("company");

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Evidence Upload Test</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Entity Type</label>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as any)}
          className="border p-2 rounded w-full"
        >
          <option value="company">Company</option>
          <option value="leader">Leader</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Entity ID</label>
        <input
          type="number"
          value={entityId}
          onChange={(e) => setEntityId(Number(e.target.value))}
          className="border p-2 rounded w-full"
        />
      </div>

      <EvidenceUpload entityId={entityId} entityType={entityType} />
    </div>
  );
}
