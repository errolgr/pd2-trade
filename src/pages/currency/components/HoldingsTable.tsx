import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PackageOpen, Search, SearchX, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatHr } from '@/lib/utils';
import type { ValuationLine } from '@/lib/networth-api';
import { DataTable } from './DataTable';
import { DataTableColumnHeader } from './DataTableColumnHeader';
import { ConfidenceBadge, HoldingName, PriceChange } from './HoldingCells';
import { formatUnitPrice } from '../lib/networth-format';
import type { TFunction } from 'i18next';
import { useTranslation } from '@/i18n';

interface HoldingsTableProps {
  lines: ValuationLine[];
  totalHr: number;
  showTab?: boolean;
  toolbar?: React.ReactNode;
}

function createColumns(totalHr: number, showTab: boolean, t: TFunction): ColumnDef<ValuationLine>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.item')} />,
      cell: ({ row }) => <HoldingName line={row.original}
        showTab={showTab} />,
    },
    {
      accessorKey: 'qty',
      meta: { align: 'right' },
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.qty')} />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span>,
    },
    {
      id: 'unitPrice',
      accessorFn: (line) => line.unitPrice ?? undefined,
      meta: { align: 'right' },
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.unit')} />,
      sortUndefined: 'last',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{formatUnitPrice(row.original.unitPrice)}</span>
      ),
    },
    {
      accessorKey: 'value',
      meta: { align: 'right' },
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.value')} />,
      cell: ({ row }) => <span className="font-medium tabular-nums">{formatHr(row.original.value)}</span>,
    },
    {
      id: 'share',
      accessorFn: (line) => (totalHr > 0 ? line.value / totalHr : 0),
      meta: { align: 'right' },
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.share')} />,
      cell: ({ getValue }) => <ShareCell share={getValue() as number} />,
    },
    {
      id: 'change7d',
      accessorFn: (line) => line.priceChange7dPercent ?? undefined,
      sortUndefined: 'last',
      meta: { align: 'right' },
      header: ({ column }) => <DataTableColumnHeader column={column}
        title={t('columns.change7d')} />,
      cell: ({ row }) => <PriceChange percent={row.original.priceChange7dPercent} />,
    },
    {
      accessorKey: 'confidence',
      header: t('columns.price'),
      enableSorting: false,
      cell: ({ row }) => <ConfidenceBadge line={row.original} />,
    },
  ];
}

/** Share of the total as text with a hairline bar underneath. */
function ShareCell({ share }: { share: number }) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-muted-foreground">{(share * 100).toFixed(1)}%</span>
      <span className="h-0.5 w-10 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary/60"
          style={{ width: `${Math.min(100, share * 100)}%` }} />
      </span>
    </span>
  );
}

export function HoldingsTable({ lines, totalHr, showTab = false, toolbar }: HoldingsTableProps) {
  const { t } = useTranslation('currency');
  const [query, setQuery] = useState('');
  const [hideZero, setHideZero] = useState(true);
  const columns = useMemo(() => createColumns(totalHr, showTab, t), [totalHr, showTab, t]);

  const needle = query.trim().toLowerCase();
  const visible = lines.filter(
    (line) =>
      (!hideZero || line.value > 0) &&
      (!needle || line.name.toLowerCase().includes(needle) || line.tab?.toLowerCase().includes(needle)),
  );
  const hiddenZero = hideZero ? lines.filter((line) => line.value <= 0).length : 0;
  const visibleHr = visible.reduce((sum, line) => sum + line.value, 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.stopPropagation();
                setQuery('');
              }
            }}
            placeholder={t('holdings.searchPlaceholder')}
            aria-label={t('holdings.searchLabel')}
            className="h-9 pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              aria-label={t('holdings.clearSearch')}
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex h-9 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5">
          <Switch id="hide-zero"
            checked={hideZero}
            onCheckedChange={setHideZero} />
          <Label htmlFor="hide-zero"
            className="cursor-pointer text-xs text-muted-foreground">
            {t('holdings.hideZero')}
          </Label>
        </div>
        {toolbar}
      </div>
      <DataTable
        columns={columns}
        data={visible}
        initialSorting={[{ id: 'value', desc: true }]}
        emptyMessage={lines.length ? t('holdings.nothingMatches') : t('holdings.noneInStash')}
        emptyIcon={lines.length ? <SearchX /> : <PackageOpen />}
      />
      <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
        <p>{hiddenZero > 0 && t('holdings.zeroHidden', { count: hiddenZero })}</p>
        {visible.length > 0 && (
          <p className="shrink-0 tabular-nums">
            {t('holdings.count', { count: visible.length })} ·{' '}
            <span className="font-medium text-foreground">{formatHr(visibleHr)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
