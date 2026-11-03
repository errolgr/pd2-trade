import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  RowData,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-align header and cells (numeric columns). */
    align?: 'right';
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialSorting?: SortingState;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialSorting = [],
  emptyMessage,
  emptyIcon,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation('currency');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/40">
      <Table>
        <TableHeader className="bg-muted/30">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}
              className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    className={cn(
                      'h-9 first:pl-3 last:pr-3',
                      header.column.columnDef.meta?.align === 'right' && 'text-right',
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <motion.tr
                key={row.id}
                layout="position"
                transition={{ duration: 0.22, ease: EASE_OUT }}
                data-slot="table-row"
                className="border-b border-border/60 transition-colors duration-(--dur-fast) hover:bg-muted/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'py-1.5 first:pl-3 last:pr-3',
                      cell.column.columnDef.meta?.align === 'right' && 'text-right',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </motion.tr>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length}
                className="h-28 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  {emptyIcon && (
                    <span className="flex size-9 items-center justify-center rounded-full bg-muted/60 [&_svg]:size-4">
                      {emptyIcon}
                    </span>
                  )}
                  <span className="text-sm">{emptyMessage ?? t('table.noResults')}</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
