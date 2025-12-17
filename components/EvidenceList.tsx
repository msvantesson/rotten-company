import React from "react";

type EvidenceItem = {
  id: number;
  title: string;
  summary?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
};

type Props = {
  evidence: EvidenceItem[];
};

export function EvidenceList({ evidence }: Props) {
  if (!evidence || evidence.length === 0) {
    return <p>No approved evidence found.</p>;
  }

  return (
    <div className="space-y-6">
      {evidence.map((item) => (
        <div key={item.id} className="border p-4 rounded-md bg-white shadow-sm">
          <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-700">{item.summary}</p>

          {item.file_url && item.file_type && (
            <div className="mt-3">
              {item.file_type.startsWith("image") && (
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="max-w-full h-auto rounded-md border"
                />
              )}

              {item.file_type === "application/pdf" && (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-blue-600 underline"
                >
                  View PDF
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
