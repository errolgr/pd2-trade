import { useState } from 'react';
import { RuneLadder, type RunePrice } from '@pd2-trader/ui';

export const meta = {
  title: 'Rune prices by tier',
  description: 'The rune economy from Zod down, grouped into high / mid / low with 7-day change and listing counts; one rune highlighted and the rows selectable.',
  order: 1,
};

const RUNES: RunePrice[] = [
  { name: 'Zod', price: 0.62, change: -3.1, listings: 41 },
  { name: 'Cham', price: 0.48, change: 1.2, listings: 66 },
  { name: 'Jah', price: 1.12, change: 4.8, listings: 212 },
  { name: 'Ber', price: 1, change: 0, listings: 380 },
  { name: 'Sur', price: 0.55, change: -2.4, listings: 133 },
  { name: 'Lo', price: 0.58, change: 6.3, listings: 151 },
  { name: 'Ohm', price: 0.41, change: -1.8, listings: 98 },
  { name: 'Vex', price: 0.28, change: 0.4, listings: 174 },
  { name: 'Gul', price: 0.14, change: -5.2, listings: 120 },
  { name: 'Ist', price: 0.12, change: 2.1, listings: 260 },
  { name: 'Mal', price: 0.06, change: 0.2, listings: 190 },
  { name: 'Um', price: 0.035, change: -0.9, listings: 140 },
  { name: 'Lem', price: 0.0042, listings: 12 },
  { name: 'Shael', price: null },
];

export default function HighRunesExample() {
  const [selected, setSelected] = useState('Ber');
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-1">
      <RuneLadder runes={RUNES}
        highlight={selected}
        onSelect={(r) => setSelected(r.name)} />
    </div>
  );
}
