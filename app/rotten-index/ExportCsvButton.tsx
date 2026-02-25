"use client";

import React from "react";

function escapeCsvCell(value: string) {
  // CSV rules: wrap in quotes if contains quote, comma, or newline; double quotes inside.
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function tableToCsv(table: HTMLTableElement) {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows
    .map((tr) => {
      const cells = Array.from(tr.querySelectorAll("th,td"));
      return cells
        .map((cell) => escapeCsvCell((cell.textContent ?? "").trim()))
        .join(",");
    })
    .join("\n");
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export default function ExportCsvButton({
  tableId,
  filename,
  className,
}: {
  tableId: string;
  filename: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        className ??
        "rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800"
      }
      onClick={() => {
        const table = document.getElementById(tableId) as HTMLTableElement | null;
        if (!table) {
          alert("Could not find table to export.");
          return;
        }

        const csv = tableToCsv(table);
        downloadTextFile(filename, csv, "text/csv;charset=utf-8");
      }}
    >
      Export CSV
    </button>
  );
}
