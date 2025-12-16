import React from "react";

type EvidenceItem = {
  id: number;
  title: string;
  summary: string;
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
        <div key={item.id} className="border p-4 rounded-md">
          <h3 className="font-semibold text-lg">{item.title}</h3>
          <p className="text-sm text-gray-700">{item.summary}</p>

          {item.file_url && (
            <div className="mt-3">
              {item.file_type?.startsWith("image") && (
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="max-w-full h-auto rounded-md"
                />
              )}

              {item.file_type === "application/pdf" && (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View PDF
                </a>
              )}

              {item.file_type?.startsWith("audio") && (
                <audio controls src={item.file_url} className="mt-2 w-full" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
