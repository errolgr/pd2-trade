import { ItemTooltip, PriceTag, type TooltipItem } from '@pd2-trader/ui';

export const meta = {
  title: 'Unique, corrupted',
  description: 'Harlequin Crest with enhanced defense, requirements, variable rolls marked inside their ranges, a corruption socket and a market price footer.',
  order: 1,
};

const SHAKO: TooltipItem = {
  name: 'Harlequin Crest',
  base: 'Shako',
  quality: 'Unique',
  defense: { value: 141, enhanced: true },
  durability: [12, 12],
  requirements: { strength: 50, level: 62 },
  itemLevel: 87,
  mods: [
    { text: '+2 to All Skills' },
    { text: '+1.5 to Maximum Life (Based on Character Level)' },
    { text: '+1.5 to Maximum Mana (Based on Character Level)' },
    { text: 'Damage Reduced by 10%', range: [7, 10], value: 10 },
    { text: '50% Better Chance of Getting Magic Items' },
    { text: '+2 to All Attributes' },
  ],
  sockets: 1,
  socketed: [{ name: 'Um Rune' }],
  corrupted: true,
};

export default function UniqueExample() {
  return (
    <ItemTooltip item={SHAKO}
      footer={
        <span className="flex items-center justify-between text-muted-foreground">
          Market value <PriceTag amount={1.6}
            unit="hr"
            className="font-semibold text-foreground" />
        </span>
      } />
  );
}
