import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatHr } from '@/lib/utils';
import type { ValuationLine } from '@/lib/networth-api';
import { DataTable } from './DataTable';
import { DataTableColumnHeader } from './DataTableColumnHeader';
import { ConfidenceBadge, HoldingName, PriceChange } from './HoldingCells';
import { formatUnitPrice } from '../lib/networth-format';

interface HoldingsTableProps {
  lines: ValuationLine[];
  totalHr: number;
  showTab?: boolean;
  toolbar?: React.ReactNode;
}

function createColumns(totalHr: number, showTab: boolean): ColumnDef<ValuationLine>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="Item" />,
      cell: ({ row }) => <HoldingName line={row.original}
        showTab={showTab} />,
    },
    {
      accessorKey: 'qty',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="Qty" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span>,
    },
    {
      id: 'unitPrice',
      accessorFn: (line) => line.unitPrice ?? undefined,
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="Unit" />,
      sortUndefined: 'last',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{formatUnitPrice(row.original.unitPrice)}</span>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="Value" />,
      cell: ({ row }) => <span className="tabular-nums">{formatHr(row.original.value)}</span>,
    },
    {
      id: 'share',
      accessorFn: (line) => (totalHr > 0 ? line.value / totalHr : 0),
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="%" />,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground">{((getValue() as number) * 100).toFixed(1)}%</span>
      ),
    },
    {
      id: 'change7d',
      accessorFn: (line) => line.priceChange7dPercent ?? undefined,
      sortUndefined: 'last',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="7d" />,
      cell: ({ row }) => <PriceChange percent={row.original.priceChange7dPercent} />,
    },
    {
      accessorKey: 'confidence',
      header: 'Price',
      enableSorting: false,
      cell: ({ row }) => <ConfidenceBadge line={row.original} />,
    },
  ];
}

export function HoldingsTable({ lines, totalHr, showTab = false, toolbar }: HoldingsTableProps) {
  const [query, setQuery] = useState('');
  const [hideZero, setHideZero] = useState(true);
  const columns = useMemo(() => createColumns(totalHr, showTab), [totalHr, showTab]);

  const needle = query.trim().toLowerCase();
  const visible = lines.filter(
    (line) =>
      (!hideZero || line.value > 0) &&
      (!needle || line.name.toLowerCase().includes(needle) || line.tab?.toLowerCase().includes(needle)),
  );
  const hiddenZero = hideZero ? lines.filter((line) => line.value <= 0).length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="hide-zero"
            checked={hideZero}
            onCheckedChange={setHideZero} />
          <Label htmlFor="hide-zero"
            className="text-xs text-muted-foreground">
            Hide zero value
          </Label>
        </div>
        {toolbar}
      </div>
      <DataTable
        columns={columns}
        data={visible}
        initialSorting={[{ id: 'value', desc: true }]}
        emptyMessage={lines.length ? 'Nothing matches.' : 'None in your stash.'}
      />
      {hiddenZero > 0 && (
        <p className="text-xs text-muted-foreground">
          {hiddenZero} zero-value {hiddenZero === 1 ? 'row' : 'rows'} hidden (unpriced items are listed but valued at
          0).
        </p>
      )}
    </div>
  );
}
