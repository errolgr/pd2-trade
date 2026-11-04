import { RuneLadder, type RunePrice } from '@pd2-trader/ui';

export const meta = {
  title: 'Holdings as links',
  description: '`quantity` prices the stack (unit price muted under it); `getHref` makes each row a link that keeps cmd-click / new tab.',
  order: 2,
};

const HELD: RunePrice[] = [
  { name: 'Ber', price: 1, quantity: 3 },
  { name: 'Ist', price: 0.12, quantity: 9 },
  { name: 'Um', price: 0.035, quantity: 14 },
];

export default function HoldingsExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-1">
      <RuneLadder runes={HELD}
        grouped={false}
        getHref={(r) => `#/economy/runes/${r.name.toLowerCase()}`} />
    </div>
  );
}
