import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@pd2-trader/ui';

const ROWS = [
  { name: 'Harlequin Crest', cls: 'text-q-unique', seller: 'Sorc_Errol', price: '1.5' },
  { name: "Tal Rasha's Guardianship", cls: 'text-q-set', seller: 'HammerDin', price: '0.8' },
  { name: 'Grim Shell', cls: 'text-q-rare', seller: 'Javazon_77', price: '0.25' },
  { name: 'Ber Rune', cls: 'text-q-rune', seller: 'RuneMule', price: '1' },
];

export const meta = {
  title: 'Listings',
  description:
    'Static rows with a caption and a totals footer; `data-state="selected"` marks a row. Right-align prices with `text-right tabular-nums`.',
  order: 0,
};

export default function ListingsExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface">
      <Table>
        <TableCaption>Recent trades, softcore ladder</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead className="text-right">HR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.name}
              data-state={row.price === '1' ? 'selected' : undefined}>
              <TableCell className={row.cls}>{row.name}</TableCell>
              <TableCell className="text-muted-foreground">{row.seller}</TableCell>
              <TableCell className="text-right tabular-nums">{row.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right tabular-nums">3.55</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
