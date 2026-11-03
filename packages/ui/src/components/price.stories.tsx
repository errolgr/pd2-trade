import type { Story, StoryDefault } from '@ladle/react';
import { CurrencyAmount, PriceTag } from '@pd2-trader/ui';

export default { title: 'Domain / PriceTag & CurrencyAmount' } satisfies StoryDefault;

export const Tags: Story = () => (
  <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-4 text-sm">
    <PriceTag amount={1.3}
      unit="hr" />
    <PriceTag amount={0.04}
      unit="hr"
      trend="down" />
    <PriceTag amount={0.0042}
      unit="hr" />
    <PriceTag amount={27.5}
      unit="hr"
      trend="up" />
    <PriceTag amount={1240}
      unit="hr"
      trend="flat" />
    <PriceTag amount={2}
      unit="rune"
      rune="Ber" />
    <PriceTag amount={1.5}
      unit="rune"
      rune="Jah Rune"
      trend="up" />
    <PriceTag amount={2500000}
      unit="gold" />
    <PriceTag amount={Number.NaN}
      unit="hr" />
    <p className="text-2xs text-muted-foreground">
      Inherits font size: <PriceTag amount={0.85}
        unit="hr"
        trend="up" />
    </p>
  </div>
);

export const Amounts: Story = () => (
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
