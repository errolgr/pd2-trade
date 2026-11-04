import { ELEMENTS, ResistanceBar } from '@pd2-trader/ui';

export const meta = {
  title: 'Compact grid',
  description: '`layout="compact"` stacks the value over the bar so the four fit side by side in a header.',
  order: 2,
};

const TOTALS = { fire: 75, cold: 72, lightning: 110, poison: 31 } as const;

export default function CompactExample() {
  return (
    <div className="grid w-popover grid-cols-4 gap-3 rounded-lg border bg-surface p-4">
      {ELEMENTS.map((el) => (
        <ResistanceBar key={el}
          element={el}
          total={TOTALS[el]}
          layout="compact" />
      ))}
    </div>
  );
}
