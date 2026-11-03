import type { Story, StoryDefault } from '@ladle/react';
import { ItemName } from '@pd2-trader/ui';

export default { title: 'Domain / ItemName' } satisfies StoryDefault;

const ITEMS = [
  { name: 'Harlequin Crest', quality: 'Unique' },
  { name: "Tal Rasha's Guardianship", quality: 'Set' },
  { name: 'Grim Shell', quality: 'Rare' },
  { name: 'Cruel Grand Charm of Vita', quality: 'Magic' },
  { name: 'Doom Knuckle', quality: 'Crafted' },
  { name: 'Ber Rune', quality: 'Rune' },
  { name: 'Archon Plate', quality: 'Superior' },
  { name: 'Monarch', quality: 'Normal' },
] as const;

export const Qualities: Story = () => (
  <div className="flex w-sidebar flex-col gap-1.5 rounded-lg border bg-surface p-4 text-sm">
    {ITEMS.map((item) => (
      <div key={item.name}
        className="flex justify-between">
        <ItemName name={item.name}
          quality={item.quality} />
        <span className="text-2xs text-muted-foreground">{item.quality}</span>
      </div>
    ))}
    <div className="flex justify-between">
      <ItemName name="Enigma"
        quality="Normal"
        runeword />
      <span className="text-2xs text-muted-foreground">Runeword</span>
    </div>
    <div className="flex justify-between">
      <ItemName name="Unknown quality"
        quality={null} />
      <span className="text-2xs text-muted-foreground">null</span>
    </div>
  </div>
);
