import type { Story, StoryDefault } from '@ladle/react';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@pd2-trader/ui';

export default { title: 'Primitives / Table' } satisfies StoryDefault;

const ROWS = [
  { name: 'Harlequin Crest', cls: 'text-q-unique', seller: 'Sorc_Errol', price: '1.5' },
  { name: "Tal Rasha's Guardianship", cls: 'text-q-set', seller: 'HammerDin', price: '0.8' },
  { name: 'Grim Shell', cls: 'text-q-rare', seller: 'Javazon_77', price: '0.25' },
  { name: 'Ber Rune', cls: 'text-q-rune', seller: 'RuneMule', price: '1' },
];

export const Listings: Story = () => (
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
