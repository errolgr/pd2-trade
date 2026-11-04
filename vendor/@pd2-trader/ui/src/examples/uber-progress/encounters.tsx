import { UBER_ENCOUNTERS, UberProgress } from '@pd2-trader/ui';

export const meta = {
  title: 'Boss materials',
  description: 'PD2 encounters with the materials in the stash: the scarcest decides how many runs are ready; short materials muted.',
  order: 1,
};

const STASH: Record<string, number> = {
  'Key of Terror': 7, 'Key of Hate': 5, 'Key of Destruction': 6,
  "Mephisto's Brain": 2, "Diablo's Horn": 3, "Baal's Eye": 2,
  'Sigil of Madawc': 1, 'Sigil of Talic': 0, 'Sigil of Korlic': 2,
  'Pure Demonic Essence': 1, 'Prime Evil Soul': 1, 'Black Soulstone': 1,
};
const NAMES = { pandemonium: 'Pandemonium', tristram: 'Uber Tristram', ancients: 'Uber Ancients', dclone: 'Diablo Clone' } as const;

export default function EncountersExample() {
  return (
    <div className="flex w-popover flex-col gap-2.5 rounded-lg border bg-surface p-4">
      {(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((id) => (
        <UberProgress key={id}
          encounter={NAMES[id]}
          materials={UBER_ENCOUNTERS[id].map((name) => ({ name, have: STASH[name] ?? 0 }))} />
      ))}
    </div>
  );
}
