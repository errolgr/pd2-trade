import React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { t } = useTranslation('currency');
  const alignRight = column.columnDef.meta?.align === 'right';
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  const nextLabel =
    sorted === 'desc'
      ? t('table.clearSorting')
      : sorted === 'asc'
        ? t('table.sortDescending')
        : t('table.sortAscending');

  return (
    <div className={cn('flex items-center', alignRight && 'justify-end', className)}>
      <button
        type="button"
        aria-label={t('table.sortLabel', { title, action: nextLabel })}
        className={cn(
          'group/sort inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium uppercase tracking-wide outline-none transition-[color,background-color,transform] duration-(--dur-fast) ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-[0.97]',
          alignRight ? '-mr-2 flex-row-reverse' : '-ml-2',
          sorted && 'text-foreground',
        )}
        onClick={() => {
          if (column.getIsSorted() === 'desc') {
            column.clearSorting();
            return;
          }
          column.toggleSorting(column.getIsSorted() === 'asc');
        }}
      >
        <span>{title}</span>
        {sorted === 'desc' ? (
          <ArrowDown className="size-3.5 text-primary" />
        ) : sorted === 'asc' ? (
          <ArrowUp className="size-3.5 text-primary" />
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-40 transition-opacity duration-(--dur-fast) group-hover/sort:opacity-80" />
        )}
      </button>
    </div>
  );
}
