import { PriceHistoryChart, type PricePoint } from '@pd2-trader/ui';

export const meta = {
  title: 'Priced in runes, falling',
  description: 'Enigma priced in Ber over two weeks, trending down (destructive color), no volume.',
  order: 2,
};

const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 15);
const POINTS: PricePoint[] = [6.5, 6.4, 6.4, 6.2, 6.1, 6.2, 6, 5.8, 5.9, 5.7, 5.6, 5.5, 5.6, 5.4].map((value, i) => ({
  t: START + i * DAY,
  value,
}));

export default function RuneUnitExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface p-3">
      <PriceHistoryChart points={POINTS}
        unit="rune"
        rune="Ber"
        height={120}
        aria-label="Enigma, 14 days, 6.5 → 5.4 Ber" />
    </div>
  );
}
