import { useState } from 'react';
import { ItemTooltip, PaperDoll, PriceTag, type EquipSlot, type EquippedItem } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

const GEAR: Partial<Record<EquipSlot, EquippedItem>> = {
  helm: { name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png`, corrupted: true },
  amulet: { name: "Mara's Kaleidoscope", quality: 'Unique', src: `${ART}/invamu.png` },
  weapon: { name: 'Heart of the Oak', quality: 'Normal', runeword: true, src: `${ART}/invfla.png` },
  armor: { name: 'Enigma', quality: 'Superior', runeword: true, src: `${ART}/invaaru.png` },
  offhand: { name: 'Spirit', quality: 'Normal', runeword: true, src: `${ART}/invmirrorshield.png` },
  'ring-right': { name: 'Stone of Jordan', quality: 'Unique', src: `${ART}/invrin.png` },
  belt: { name: 'Arachnid Mesh', quality: 'Unique', src: `${ART}/invmbl.png` },
  'ring-left': { name: 'Bul-Kathos\' Wedding Band', quality: 'Unique', src: `${ART}/invrng.png` },
  gloves: { name: 'Magefist', quality: 'Unique', src: `${ART}/invlgl.png` },
  boots: { name: "War Traveler", quality: 'Unique', src: `${ART}/invmbt.png`, ethereal: false },
};

export const meta = {
  title: 'Player equipment',
  description: 'A Sorceress doll in the in-game layout: quality frames, the corrupted mark, price badges, an `ItemTooltip` on hover and selectable slots.',
  order: 1,
};

const PRICES: Partial<Record<EquipSlot, number>> = { helm: 1.6, armor: 6.2, amulet: 0.3, 'ring-right': 0.4 };

export default function PlayerExample() {
  const [selected, setSelected] = useState<EquipSlot>('helm');
  return (
    <div className="w-fit rounded-lg border bg-surface p-3">
      <PaperDoll
        items={GEAR}
        selected={selected}
        onSelect={setSelected}
        badgeFor={(slot) =>
          PRICES[slot] !== undefined && <PriceTag amount={PRICES[slot]}
            unit="hr"
            className="text-q-gold" />
        }
        tooltipFor={(slot) => {
          const it = GEAR[slot];
          return it && <ItemTooltip item={{ name: it.name, quality: it.quality ?? null, runeword: it.runeword, corrupted: it.corrupted }} />;
        }}
      />
    </div>
  );
}
