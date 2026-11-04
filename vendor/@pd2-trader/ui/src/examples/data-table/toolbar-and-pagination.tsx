import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@pd2-trader/ui';
import { useState } from 'react';

interface Trade {
  id: string;
  item: string;
  buyer: string;
  mode: 'Softcore' | 'Hardcore';
  price: number;
  listed: string;
}

const ITEMS = ['Ber Rune', 'Jah Rune', 'Harlequin Crest', 'Enigma', 'Hellfire Torch', 'Mara\'s Kaleidoscope', 'Arachnid Mesh'];
const BUYERS = ['CowKing', 'Sorc_Errol', 'HammerDin', 'Javazon_77', 'RuneMule'];

const TRADES: Trade[] = Array.from({ length: 42 }, (_, i) => ({
  id: `trade-${i}`,
  item: ITEMS[i % ITEMS.length],
  buyer: BUYERS[(i * 3) % BUYERS.length],
  mode: i % 4 === 0 ? 'Hardcore' : 'Softcore',
  price: Math.round(((i * 37) % 50) + 5) / 10,
  listed: `${(i % 23) + 1}h ago`,
}));

const COLUMNS: ColumnDef<Trade>[] = [
  { accessorKey: 'item', header: 'Item', enableHiding: false },
  { accessorKey: 'buyer', header: 'Buyer' },
  {
    accessorKey: 'mode',
    header: 'Mode',
    cell: ({ row }) => <Badge variant="outline">{row.original.mode}</Badge>,
  },
  {
    accessorKey: 'price',
    meta: { align: 'end', label: 'Price' },
    header: ({ column }) => <DataTableColumnHeader column={column}
      title="HR" />,
    cell: ({ row }) => row.original.price.toFixed(1),
  },
  { accessorKey: 'listed', header: 'Listed', enableSorting: false, meta: { className: 'text-muted-foreground' } },
];

export const meta = {
  title: 'Filter, columns and pagination',
  description:
    '`toolbar` takes a DataTableToolbar (global filter, DataTableViewOptions, actions); `footer` takes a DataTablePagination once `pageSize` is set. `selectable` adds a checkbox column. State can be controlled, as sorting and columns are here.',
  order: 1,
};

export default function DataTableToolbarExample() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columns, setColumns] = useState<VisibilityState>({ listed: false });
  const [filter, setFilter] = useState('');
  return (
    <div className="w-full max-w-2xl rounded-lg border bg-surface p-3">
      <DataTable
        columns={COLUMNS}
        data={TRADES}
        getRowId={(row) => row.id}
        sorting={sorting}
        onSortingChange={setSorting}
        columnVisibility={columns}
        onColumnVisibilityChange={setColumns}
        filter={filter}
        onFilterChange={setFilter}
        selectable
        pageSize={10}
        dense
        aria-label="Recent trades"
        toolbar={
          <DataTableToolbar placeholder="Filter trades…">
            <DataTableViewOptions />
            <Button size="sm"
              variant="secondary"
              className="h-8">
              Export
            </Button>
          </DataTableToolbar>
        }
        footer={<DataTablePagination pageSizeOptions={[10, 25]} />}
        empty={<span className="text-xs text-muted-foreground">No trades match {`"${filter}"`}.</span>}
      />
    </div>
  );
}
