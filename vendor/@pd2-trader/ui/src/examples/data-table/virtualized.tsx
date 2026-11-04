import { DataTable, DataTableToolbar, RuneIcon, type ColumnDef } from '@pd2-trader/ui';
import { useState } from 'react';

interface Sale {
  id: number;
  rune: string;
  zone: string;
  price: number;
}

const RUNES = ['Ber', 'Jah', 'Sur', 'Lo', 'Ohm', 'Vex', 'Gul', 'Ist'];
const ZONES = ['Hell cows', 'Chaos Sanctuary', 'Worldstone Keep', 'Pit', 'Ancient Tunnels'];

const SALES: Sale[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  rune: RUNES[i % RUNES.length],
  zone: ZONES[(i * 7) % ZONES.length],
  price: Math.round((((i * 53) % 140) / 100 + 0.1) * 100) / 100,
}));

const COLUMNS: ColumnDef<Sale>[] = [
  { accessorKey: 'id', header: '#', meta: { align: 'end', className: 'w-14 text-muted-foreground' } },
  {
    accessorKey: 'rune',
    header: 'Rune',
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <RuneIcon rune={row.original.rune} />
        {row.original.rune}
      </span>
    ),
  },
  { accessorKey: 'zone', header: 'Found in' },
  { accessorKey: 'price', header: 'HR', meta: { align: 'end' } },
];

export const meta = {
  title: 'Virtualized 1,000 rows',
  description:
    '`virtualized` renders only the rows in view (sticky header, fixed `rowHeight`); give the DataTable a height through `className` and the body scrolls. Use it for long lists instead of pagination.',
  order: 2,
};

export default function DataTableVirtualizedExample() {
  const [clicked, setClicked] = useState<Sale | null>(null);
  return (
    <div className="flex w-popover flex-col gap-2 rounded-lg border bg-surface p-3">
      <DataTable
        columns={COLUMNS}
        data={SALES}
        getRowId={(row) => String(row.id)}
        virtualized
        dense
        onRowClick={setClicked}
        className="h-80"
        aria-label="Rune drops"
        toolbar={<DataTableToolbar placeholder="Filter drops…" />}
      />
      <p className="text-2xs text-muted-foreground">
        {clicked ? `Row ${clicked.id}: ${clicked.rune} from ${clicked.zone}` : 'Click a row'}
      </p>
    </div>
  );
}
