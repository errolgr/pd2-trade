import { PriceTag } from '@pd2-trader/ui';

export const meta = {
  title: 'Units and trends',
  description: 'HR with size-aware precision, rune counts with the rune icon, grouped gold, trend arrows; inherits the font size.',
  order: 1,
};

export default function UnitsExample() {
  return (
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
}
