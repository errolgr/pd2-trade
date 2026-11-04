import { useState } from 'react';
import { EquipmentSlot, PriceTag, QualityBadge } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Tile and row',
  description: 'One slot as an art tile (paper dolls) or a row with name, meta and badges (gear lists, sim pickers); empty slots, `selected` as aria-pressed.',
  order: 1,
};

export default function LayoutsExample() {
  const [slot, setSlot] = useState<'helm' | 'amulet' | 'boots'>('helm');
  return (
    <div className="flex w-popover gap-4 rounded-lg border bg-surface p-3">
      <div className="flex w-20 flex-col gap-1.5">
        <EquipmentSlot slot="helm"
          item={{ name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png` }}
          badges="1.6"
          onClick={() => setSlot('helm')}
          selected={slot === 'helm'} />
        <EquipmentSlot slot="boots"
          height={60} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <EquipmentSlot layout="row"
          slot="helm"
          item={{ name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png` }}
          meta="Shako · 141 def"
          badges={<PriceTag amount={1.6}
            unit="hr"
            className="text-2xs text-q-gold" />}
          onClick={() => setSlot('helm')}
          selected={slot === 'helm'} />
        <EquipmentSlot layout="row"
          slot="amulet"
          item={{ name: "Mara's Kaleidoscope", quality: 'Unique', src: `${ART}/invamu.png`, corrupted: true }}
          meta="Amulet"
          badges={<QualityBadge quality="Unique" />}
          onClick={() => setSlot('amulet')}
          selected={slot === 'amulet'} />
        <EquipmentSlot layout="row"
          slot="boots"
          onClick={() => setSlot('boots')}
          selected={slot === 'boots'} />
      </div>
    </div>
  );
}
