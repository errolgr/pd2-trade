import { StatLine } from '@pd2-trader/ui';

export const meta = {
  title: 'Mod lines',
  description: 'Mods in the magic color; `range` adds the roll range, `value` marks the rolled number (perfect rolls get `data-perfect`), corrupted mods in red.',
  order: 1,
};

export default function ModsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-0.5 rounded-lg border bg-surface p-4 text-center text-xs">
      <StatLine>+2 to All Skills</StatLine>
      <StatLine range={[20, 40]}
        value={37}>+37% Faster Cast Rate</StatLine>
      <StatLine range={[25, 40]}
        value={40}>+40 to Life</StatLine>
      <StatLine range={[50, 50]}>Damage Reduced by 10%</StatLine>
      <StatLine corrupted>+20% Faster Hit Recovery</StatLine>
    </div>
  );
}
