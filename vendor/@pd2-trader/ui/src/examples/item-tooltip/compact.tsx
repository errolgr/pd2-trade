import { ItemTooltip, type TooltipItem } from '@pd2-trader/ui';

export const meta = {
  title: 'Compact, ethereal weapon',
  description: '`compact` for result cards whose header already names the item: no name, smaller text. Two-hand damage, ethereal, empty sockets.',
  order: 4,
};

const THRESHER: TooltipItem = {
  name: "Reaper's Toll",
  base: 'Thresher',
  quality: 'Unique',
  damage: [{ kind: 'two-hand', min: 62, max: 470, enhanced: true }],
  durability: [33, 33],
  requirements: { strength: 114, dexterity: 89, level: 75 },
  mods: [
    { text: '+213% Enhanced Weapon Damage', range: [190, 240], value: 213 },
    { text: '11% Life Stolen per Hit', range: [11, 15], value: 11 },
    { text: '33% Deadly Strike' },
    { text: '33% Chance to cast level 33 Decrepify on striking' },
  ],
  ethereal: true,
  sockets: 4,
};

export default function CompactExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-2">
      <ItemTooltip item={THRESHER}
        compact />
    </div>
  );
}
