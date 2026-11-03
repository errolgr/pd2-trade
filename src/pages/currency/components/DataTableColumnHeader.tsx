import React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Button, cn } from '@pd2-trader/ui';
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('table.sortLabel', { title, action: nextLabel })}
        className={cn(
          'group/sort h-7 gap-1 px-2 text-xs uppercase tracking-wide has-[>svg]:px-2',
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
      </Button>
    </div>
  );
}
