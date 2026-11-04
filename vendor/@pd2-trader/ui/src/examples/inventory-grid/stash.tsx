import { GRID_SIZES, InventoryGrid, type GridItem } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Stash tab',
  description: 'A 10×10 PD2 stash page at a smaller cell size, armor and weapons on 2×3 / 2×4 footprints, selectable items.',
  order: 2,
};

const STASH: GridItem[] = [
  { name: 'Enigma', quality: 'Superior', runeword: true, src: `${ART}/invaaru.png`, x: 0, y: 0, w: 2, h: 3 },
  { name: 'Grief', quality: 'Normal', runeword: true, src: `${ART}/invcrsu.png`, x: 2, y: 0, w: 1, h: 3 },
  { name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png`, x: 3, y: 0, w: 2, h: 2 },
  { name: 'Ber Rune', quality: 'Rune', src: 'https://pd2trader.com/assets/runes/Ber_Rune.png', x: 9, y: 9, w: 1, h: 1 },
  { name: 'Jah Rune', quality: 'Rune', src: 'https://pd2trader.com/assets/runes/Jah_Rune.png', x: 8, y: 9, w: 1, h: 1 },
  { name: 'Grim Shell', quality: 'Rare', x: 5, y: 0, w: 2, h: 2 },
];

export default function StashExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-3">
      <InventoryGrid {...GRID_SIZES.stash}
        cell={22}
        items={STASH}
        onSelect={() => {}}
        aria-label="Stash" />
    </div>
  );
}
