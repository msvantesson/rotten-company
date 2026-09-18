"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import MacroTierBadge from "@/components/MacroTierBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

type SortField = "rotten_score" | "approved_evidence_count" | "name" | "industry";

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number | null;
  industry?: string | null;
  approved_evidence_count?: number;
};

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string;
    cellClassName?: string;
  }
}

const columns: ColumnDef<CompanyRow>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>
    ),
    meta: { headClassName: "w-12 pl-5 pr-3", cellClassName: "pl-5 pr-3" },
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/company/${row.original.slug}`}
        className="text-[0.95rem] font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {row.original.name}
      </Link>
    ),
    meta: { headClassName: "min-w-[16rem]", cellClassName: "font-medium" },
  },
  {
    id: "country",
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => row.original.country ?? "—",
    meta: { headClassName: "min-w-[9rem]", cellClassName: "text-muted-foreground" },
  },
  {
    id: "industry",
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => row.original.industry ?? "—",
    meta: { headClassName: "min-w-[10rem]", cellClassName: "text-muted-foreground" },
  },
  {
    id: "approved_evidence_count",
    accessorKey: "approved_evidence_count",
    header: "Evidence",
    cell: ({ row }) => (
      <span className="text-sm font-mono tabular-nums text-muted-foreground">
        {row.original.approved_evidence_count ?? 0}
      </span>
    ),
    meta: {
      headClassName: "w-[7.5rem] pl-3 pr-5 text-right",
      cellClassName: "pl-3 pr-5 text-right",
    },
  },
  {
    id: "rotten_score",
    accessorKey: "rotten_score",
    header: "Rotten Score",
    cell: ({ row }) => (
      <span className="inline-flex min-w-[4.75rem] justify-end rounded-md bg-muted px-2.5 py-1 font-mono text-[0.95rem] font-bold tabular-nums text-foreground">
        {row.original.rotten_score != null ? row.original.rotten_score.toFixed(2) : "—"}
      </span>
    ),
    meta: {
      headClassName: "w-[9rem] pl-3 pr-5 text-right",
      cellClassName: "pl-3 pr-5 text-right",
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) =>
      row.original.rotten_score != null ? (
        <MacroTierBadge score={row.original.rotten_score} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    meta: {
      headClassName: "min-w-[11rem] text-center",
      cellClassName: "text-center",
    },
  },
];

export default function CompanyDesktopTable({
  rows,
  sort,
  dir,
  tableId,
}: {
  rows: CompanyRow[];
  sort: SortField;
  dir: "asc" | "desc";
  tableId: string;
}) {
  const sortingState = useMemo(
    () => [{ id: sort, desc: dir === "desc" }],
    [sort, dir],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: sortingState,
    },
  });

  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
      <Table id={tableId}>
        <caption className="sr-only">Rotten Index company table</caption>
        <TableHeader className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.headClassName}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.id === sort ? (
                          <span aria-hidden="true" className="text-[10px] leading-none text-muted-foreground">
                            {dir === "asc" ? "▲" : "▼"}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
