import { PriceHistoryChart, type PricePoint } from '@pd2-trader/ui';

export const meta = {
  title: '30 days with volume',
  description: 'A Ber rune price in HR over 30 days with listing volume bars; the line takes the trend color, hover shows date, price and volume.',
  order: 1,
};

const DAY = 86_400_000;
const START = Date.UTC(2026, 9, 1);
const VALUES = [1.02, 1.0, 0.98, 1.01, 1.04, 1.03, 1.06, 1.05, 1.08, 1.1, 1.07, 1.09, 1.12, 1.15, 1.13, 1.16, 1.14, 1.18, 1.2, 1.17, 1.19, 1.22, 1.25, 1.23, 1.26, 1.24, 1.28, 1.3, 1.27, 1.31];
const POINTS: PricePoint[] = VALUES.map((value, i) => ({ t: START + i * DAY, value, volume: 40 + ((i * 37) % 60) }));

export default function ThirtyDaysExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface p-3">
      <PriceHistoryChart points={POINTS}
        unit="hr"
        aria-label="Ber Rune, 30 days, 1.02 → 1.31 HR" />
    </div>
  );
}
