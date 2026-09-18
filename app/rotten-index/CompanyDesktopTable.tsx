"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/company/${row.original.slug}`}
        className="font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {row.original.name}
      </Link>
    ),
    meta: { headClassName: "min-w-[15rem]", cellClassName: "font-medium" },
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => row.original.country ?? "—",
    meta: { headClassName: "min-w-[9rem]", cellClassName: "text-muted-foreground" },
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => row.original.industry ?? "—",
    meta: { headClassName: "min-w-[10rem]", cellClassName: "text-muted-foreground" },
  },
  {
    accessorKey: "approved_evidence_count",
    header: "Evidence",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {row.original.approved_evidence_count ?? 0}
      </span>
    ),
    meta: {
      headClassName: "text-right",
      cellClassName: "text-right",
    },
  },
  {
    accessorKey: "rotten_score",
    header: "Rotten Score",
    cell: ({ row }) =>
      row.original.rotten_score != null ? (
        <span className="inline-flex min-w-[4.75rem] justify-end rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-semibold tabular-nums text-foreground">
          {row.original.rotten_score.toFixed(2)}
        </span>
      ) : (
        "—"
      ),
    meta: {
      headClassName: "text-right",
      cellClassName: "text-right",
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
      headClassName: "text-center min-w-[240px]",
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
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: [{ id: sort, desc: dir === "desc" }],
    },
  });

  return (
    <div className="hidden rounded-lg border border-border bg-surface md:block">
      <Table id={tableId}>
        <TableHeader className="bg-muted/60">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const isSorted = sort === header.column.id;
                const ariaSort = isSorted
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                const meta = header.column.columnDef.meta as
                  | { headClassName?: string }
                  | undefined;

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={ariaSort}
                    className={meta?.headClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
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
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as
                  | { cellClassName?: string }
                  | undefined;
                return (
                  <TableCell key={cell.id} className={meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
