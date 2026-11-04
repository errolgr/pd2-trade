import { DataTable, ItemName, PriceTag, type ColumnDef, type ItemQuality } from '@pd2-trader/ui';

interface Listing {
  id: string;
  name: string;
  quality: ItemQuality;
  seller: string;
  price: number;
}

const LISTINGS: Listing[] = [
  { id: 'shako', name: 'Harlequin Crest', quality: 'Unique', seller: 'Sorc_Errol', price: 1.5 },
  { id: 'tal-armor', name: "Tal Rasha's Guardianship", quality: 'Set', seller: 'HammerDin', price: 0.8 },
  { id: 'grim', name: 'Grim Shell', quality: 'Rare', seller: 'Javazon_77', price: 0.25 },
  { id: 'ber', name: 'Ber Rune', quality: 'Rune', seller: 'RuneMule', price: 1 },
  { id: 'griffon', name: "Griffon's Eye", quality: 'Unique', seller: 'LightSorc', price: 2.5 },
];

const COLUMNS: ColumnDef<Listing>[] = [
  {
    accessorKey: 'name',
    header: 'Item',
    cell: ({ row }) => <ItemName name={row.original.name}
      quality={row.original.quality} />,
  },
  { accessorKey: 'seller', header: 'Seller', meta: { className: 'text-muted-foreground' } },
  {
    accessorKey: 'price',
    header: 'Price',
    meta: { align: 'end' },
    cell: ({ row }) => <PriceTag amount={row.original.price}
      unit="hr" />,
  },
];

export const meta = {
  title: 'Sortable',
  description:
    'Pass `columns` and `data`: every string header becomes a sort button (ascending → descending → off, `aria-sort` on the header). `meta.align: "end"` right-aligns prices; `defaultSorting` sets the first order.',
  order: 0,
};

export default function DataTableSortableExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface p-3">
      <DataTable columns={COLUMNS}
        data={LISTINGS}
        getRowId={(row) => row.id}
        defaultSorting={[{ id: 'price', desc: true }]}
        aria-label="Listings" />
    </div>
  );
}
