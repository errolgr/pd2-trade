import { ItemCard } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Item card',
  description: 'ItemCard is the dense row surface for item lists (quick-list, manage, delist). `tone` = static, interactive, selected or danger.',
  order: 1,
};

const ROWS = [
  { id: 'shako', name: 'Harlequin Crest', price: '1.5 HR' },
  { id: 'arach', name: "Arachnid Mesh", price: '2 HR' },
] as const;

export default function ItemCardExample() {
  const [selected, setSelected] = useState<string>('shako');
  return (
    <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-3 text-xs">
      <ItemCard>
        <span className="text-q-unique">Static: Griffon&apos;s Eye</span>
      </ItemCard>
      {ROWS.map((row) => (
        <ItemCard
          key={row.id}
          tone={selected === row.id ? 'selected' : 'interactive'}
          role="button"
          tabIndex={0}
          aria-pressed={selected === row.id}
          onClick={() => setSelected(row.id)}
        >
          <div className="flex items-center justify-between">
            <span className="text-q-unique">{row.name}</span>
            <span className="tabular-nums text-muted-foreground">{row.price}</span>
          </div>
        </ItemCard>
      ))}
      <ItemCard tone="danger"
        role="button"
        tabIndex={0}>
        Delist Ber rune
      </ItemCard>
    </div>
  );
}
