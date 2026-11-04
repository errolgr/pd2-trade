import { InventoryGrid, ItemTooltip, Popover, PopoverContent, PopoverTrigger, PriceTag, type GridItem } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Price badges, own trigger',
  description: '`badge` puts a corner price on an item; `wrapItem` wraps each item in your own trigger (a tap-to-pin Popover).',
  order: 3,
};

const ITEMS: GridItem[] = [
  { name: 'Hellfire Torch', quality: 'Unique', src: `${ART}/invtrch.png`, x: 0, y: 0, w: 1, h: 3,
    badge: <PriceTag amount={2.4}
      unit="hr" /> },
  { name: 'Annihilus', quality: 'Unique', src: `${ART}/invch1.png`, x: 1, y: 0, w: 1, h: 1 },
];

export default function WrappedItemsExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-3">
      <InventoryGrid cols={4}
        rows={3}
        cell={32}
        items={ITEMS}
        aria-label="Charms"
        wrapItem={(item, node) => (
          <Popover>
            <PopoverTrigger asChild>{node}</PopoverTrigger>
            <PopoverContent side="right"
              className="w-auto p-0">
              <ItemTooltip item={{ name: item.name, quality: item.quality ?? null }} />
            </PopoverContent>
          </Popover>
        )} />
    </div>
  );
}
