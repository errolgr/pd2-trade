import { useState } from 'react';
import { MarketRow, RuneIcon } from '@pd2-trader/ui';

export const meta = {
  title: 'Listing rows',
  description: 'Dense market rows: quality-colored name, sub-line, price with trend, meta; `onClick` makes the row a button, `selected` marks it.',
  order: 1,
};

export default function ListingsExample() {
  const [selected, setSelected] = useState('shako');
  return (
    <div className="flex w-popover flex-col rounded-lg border bg-surface p-1">
      <MarketRow
        name="Harlequin Crest"
        quality="Unique"
        subtitle="Shako · 141 def · Sorc_Errol"
        price={{ amount: 1.5, unit: 'hr', trend: 'up' }}
        meta="2h ago"
        onClick={() => setSelected('shako')}
        selected={selected === 'shako'}
      />
      <MarketRow
        name="Enigma"
        quality="Normal"
        runeword
        subtitle="Archon Plate · 775 def"
        price={{ amount: 4, unit: 'rune', rune: 'Ber', trend: 'flat' }}
        meta="offer"
        onClick={() => setSelected('enigma')}
        selected={selected === 'enigma'}
      />
      <MarketRow
        name="Ber Rune"
        icon={<RuneIcon rune="Ber"
          className="size-7" />}
        subtitle="x3 · RuneMule"
        price={{ amount: 1, unit: 'hr', trend: 'down' }}
        onClick={() => setSelected('ber')}
        selected={selected === 'ber'}
      />
      <MarketRow name="Grim Shell"
        quality="Rare"
        subtitle="Unpriced, no recent trades"
        meta="ask seller" />
    </div>
  );
}
