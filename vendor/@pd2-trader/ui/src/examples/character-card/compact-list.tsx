import { useState } from 'react';
import { CharacterCard, classPortraitUrl } from '@pd2-trader/ui';

const ORIGIN = 'https://pd2trader.com';

export const meta = {
  title: 'Compact rows',
  description: 'Ladder rows for lists and search hits: portrait, name and guild, level and class in its color, build tag, short mode chips, gear value and last seen; a dead hardcore character.',
  order: 1,
};

const CHARS = [
  { name: 'BlizzQueen', cls: 'sorceress', level: 94, build: 'Blizzard', guild: '[HRS]', ladder: true, hardcore: false, value: 18.4, lastSeen: '2h' },
  { name: 'Hammerfall', cls: 'paladin', level: 92, build: 'Hammerdin', ladder: true, hardcore: false, value: 11.2, lastSeen: '1d' },
  { name: 'BoneCollector', cls: 'necromancer', level: 90, build: 'Bone Spear', ladder: false, hardcore: true, value: 4.1, lastSeen: '5m' },
  { name: 'ZonMaxxed', cls: 'amazon', level: 85, build: 'Lightning Fury', ladder: true, hardcore: true, dead: true, value: 2.3, lastSeen: '3w' },
] as const;

export default function CompactListExample() {
  const [selected, setSelected] = useState('BlizzQueen');
  return (
    <div className="flex w-popover flex-col rounded-lg border bg-surface p-1">
      {CHARS.map((c) => (
        <CharacterCard
          key={c.name}
          name={c.name}
          cls={c.cls}
          level={c.level}
          build={c.build}
          guild={'guild' in c ? c.guild : undefined}
          ladder={c.ladder}
          hardcore={c.hardcore}
          dead={'dead' in c ? c.dead : undefined}
          portraitSrc={classPortraitUrl(c.cls, ORIGIN)}
          value={{ amount: c.value, unit: 'hr' }}
          lastSeen={c.lastSeen}
          selected={selected === c.name}
          onClick={() => setSelected(c.name)}
        />
      ))}
    </div>
  );
}
