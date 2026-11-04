import { ItemTooltip, PaperDoll, Popover, PopoverContent, PopoverTrigger, type EquipSlot, type EquippedItem } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

const GEAR: Partial<Record<EquipSlot, EquippedItem>> = {
  helm: { name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png` },
  armor: { name: 'Enigma', quality: 'Superior', runeword: true, src: `${ART}/invaaru.png` },
  weapon: { name: 'Heart of the Oak', quality: 'Normal', runeword: true, src: `${ART}/invfla.png` },
};

export const meta = {
  title: 'Own trigger (tap to pin)',
  description: '`wrapSlot` wraps each slot in your own trigger, here a Popover that opens on tap (touch) instead of the built-in hover card.',
  order: 3,
};

export default function TapToPinExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-3">
      <PaperDoll
        items={GEAR}
        wrapSlot={(slot, node) => {
          const it = GEAR[slot];
          if (!it) return node;
          return (
            <Popover>
              <PopoverTrigger asChild>{node}</PopoverTrigger>
              <PopoverContent side="right"
                className="w-auto p-0">
                <ItemTooltip item={{ name: it.name, quality: it.quality ?? null, runeword: it.runeword }} />
              </PopoverContent>
            </Popover>
          );
        }}
      />
    </div>
  );
}
