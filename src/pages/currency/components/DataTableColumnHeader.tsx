import React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="data-[state=open]:bg-accent -ml-3 h-8 rounded-lg"
        onClick={() => {
          if (column.getIsSorted() === 'desc') {
            column.clearSorting();
            return;
          }
          column.toggleSorting(column.getIsSorted() === 'asc');
        }}
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <ArrowDown />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUp />
        ) : (
          <ChevronsUpDown />
        )}
      </Button>
    </div>
  );
}
