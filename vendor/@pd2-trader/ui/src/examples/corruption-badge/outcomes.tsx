import { CorruptionBadge } from '@pd2-trader/ui';

export const meta = {
  title: 'Outcomes',
  description: 'The bare chip, PD2 corruption outcomes, a bricked roll, and the `dot` marker for item art.',
  order: 1,
};

export default function OutcomesExample() {
  return (
    <div className="flex w-sidebar flex-col items-start gap-2 rounded-lg border bg-surface p-4">
      <CorruptionBadge />
      <CorruptionBadge outcome="+1 Socket" />
      <CorruptionBadge outcome="+20% Faster Cast Rate" />
      <CorruptionBadge outcome="Brick: Rare"
        bricked />
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <CorruptionBadge variant="dot" /> On art tiles
      </span>
    </div>
  );
}
