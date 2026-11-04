import { Button, RunewordCard } from '@pd2-trader/ui';

export const meta = {
  title: 'Recipes',
  description: 'Runewords with their runes, allowed bases, level, mods (variable ones with ranges) and a finished-base price; PD2-only runewords get a chip.',
  order: 1,
};

export default function RecipesExample() {
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-3">
      <RunewordCard
        name="Call to Arms"
        runes={['Amn', 'Ral', 'Mal', 'Ist', 'Ohm']}
        bases={['Weapons']}
        level={57}
        mods={[
          { text: '+1 to All Skills' },
          { text: '+40% Increased Attack Speed' },
          { text: '+6 to Battle Command', range: [1, 6], value: 6 },
          { text: '+6 to Battle Orders', range: [1, 6], value: 6 },
          { text: '+3 to Battle Cry', range: [1, 4], value: 3 },
        ]}
        price={{ amount: 0.9, unit: 'hr' }}
        actions={<Button size="xs"
          variant="secondary">Search market</Button>}
      />
      <RunewordCard
        name="Plague"
        runes={['Cham', 'Fal', 'Um']}
        bases={['Swords', 'Knives', 'Claws']}
        level={67}
        badges={<span className="rounded-sm border border-border px-1.5 py-px text-3xs font-medium uppercase tracking-caps text-muted-foreground">PD2</span>}
        mods={[
          { text: 'Level 13 Lower Resist Aura When Equipped', range: [13, 17], value: 13 },
          { text: '+20% Increased Attack Speed' },
          { text: '-26% to Enemy Poison Resistance', range: [-23, -26], value: -26 },
        ]}
      />
    </div>
  );
}
