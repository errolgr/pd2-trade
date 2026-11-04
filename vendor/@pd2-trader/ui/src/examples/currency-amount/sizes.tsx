import { CurrencyAmount } from '@pd2-trader/ui';

export const meta = {
  title: 'Sizes and deltas',
  description: 'A labelled total at `display` (the one hero of a surface), `2xl`, `base` and `sm`, with a signed change pill.',
  order: 1,
};

export default function SizesExample() {
  return (
    <div className="flex w-popover flex-col gap-5 rounded-lg border bg-surface p-4">
      <CurrencyAmount label="Stash value"
        amount={412.5}
        unit="hr"
        delta={12.3}
        size="display" />
      <CurrencyAmount label="Ladder total"
        amount={1840}
        unit="hr"
        delta={-45}
        size="2xl" />
      <CurrencyAmount label="Average"
        amount={3.8}
        unit="hr"
        delta={0} />
      <CurrencyAmount label="In runes"
        amount={14}
        unit="rune"
        rune="Ber"
        size="sm" />
      <CurrencyAmount amount={2500000}
        unit="gold"
        size="sm" />
    </div>
  );
}
