import { GRID_SIZES, InventoryGrid, ItemTooltip, type GridItem } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Charm inventory',
  description: 'A PD2 charm inventory (10×4): a Hellfire Torch, an Annihilus, grand and small charms on their footprints, a corrupted charm marked, tooltips on hover.',
  order: 1,
};

const CHARMS: GridItem[] = [
  { name: 'Hellfire Torch', quality: 'Unique', src: `${ART}/invtrch.png`, x: 0, y: 0, w: 1, h: 2,
    tooltip: <ItemTooltip item={{ name: 'Hellfire Torch', base: 'Large Charm', quality: 'Unique', mods: [{ text: '+3 to Sorceress Skill Levels' }, { text: '+18 to All Attributes', range: [10, 20], value: 18 }, { text: 'All Resistances +17%', range: [10, 20], value: 17 }] }} /> },
  { name: 'Annihilus', quality: 'Unique', src: `${ART}/invch1.png`, x: 1, y: 0, w: 1, h: 1 },
  { name: 'Cold Skiller', quality: 'Magic', src: `${ART}/invch3.png`, x: 2, y: 0, w: 1, h: 3 },
  { name: 'Cold Skiller', quality: 'Magic', src: `${ART}/invch3.png`, x: 3, y: 0, w: 1, h: 3 },
  { name: 'Small Charm of Vita', quality: 'Magic', src: `${ART}/invch1.png`, x: 4, y: 0, w: 1, h: 1 },
  { name: 'Small Charm of Vita', quality: 'Magic', src: `${ART}/invch1.png`, x: 4, y: 1, w: 1, h: 1, corrupted: true },
  { name: "Gheed's Fortune", quality: 'Unique', src: `${ART}/invch3.png`, x: 9, y: 1, w: 1, h: 3 },
];

export default function CharmsExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-3">
      <InventoryGrid {...GRID_SIZES.inventory}
        items={CHARMS}
        aria-label="Charms" />
    </div>
  );
}
