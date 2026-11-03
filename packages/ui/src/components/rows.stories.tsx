import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';
import { DataRow, MarketRow, RuneIcon, StatLine } from '@pd2-trader/ui';

export default { title: 'Domain / Rows' } satisfies StoryDefault;

export const DataRows: Story = () => (
  <div className="flex w-sidebar flex-col gap-1 rounded-lg border bg-surface p-4">
    <DataRow label="Samples"
      value="84" />
    <DataRow label="Listed"
      value="2h ago" />
    <DataRow label="Confidence"
      value="High"
      valueClassName="text-success font-medium" />
    <DataRow label="Seller"
      value="A_really_long_account_name_that_truncates_in_the_row" />
  </div>
);

export const StatLines: Story = () => (
  <div className="flex w-sidebar flex-col gap-0.5 rounded-lg border bg-surface p-4 text-center text-xs">
    <div className="text-sm text-q-unique">Harlequin Crest</div>
    <div className="text-muted-foreground">Shako</div>
    <StatLine>+2 to All Skills</StatLine>
    <StatLine range={[1, 148]}>+1.5 to Maximum Life (Based on Character Level)</StatLine>
    <StatLine range={[50, 50]}>Damage Reduced by 10%</StatLine>
    <StatLine range={[2, 2]}>+2 to All Attributes</StatLine>
    <StatLine corrupted>Corrupted: +20% Faster Cast Rate</StatLine>
  </div>
);

export const MarketRows: Story = () => {
  const [selected, setSelected] = useState('shako');
  return (
    <div className="flex w-popover flex-col rounded-lg border bg-surface p-1">
      <MarketRow
        name="Harlequin Crest"
        quality="Unique"
        subtitle="Shako · 141 def · Sorc_Errol"
        price={{ amount: 1.5, unit: 'hr', trend: 'up' }}
        meta="2h ago"
        onClick={() => setSelected('shako')}
        selected={selected === 'shako'}
      />
      <MarketRow
        name="Enigma"
        quality="Normal"
        runeword
        subtitle="Archon Plate · 775 def"
        price={{ amount: 4, unit: 'rune', rune: 'Ber', trend: 'flat' }}
        meta="offer"
        onClick={() => setSelected('enigma')}
        selected={selected === 'enigma'}
      />
      <MarketRow
        name="Ber Rune"
        icon={<RuneIcon rune="Ber"
          className="size-7" />}
        subtitle="x3 · RuneMule"
        price={{ amount: 1, unit: 'hr', trend: 'down' }}
        onClick={() => setSelected('ber')}
        selected={selected === 'ber'}
      />
      <MarketRow name="Grim Shell"
        quality="Rare"
        subtitle="Unpriced, no recent trades"
        meta="ask seller" />
      <MarketRow
        name="Tal Rasha's Guardianship with a very long name that truncates"
        quality="Set"
        subtitle="Lacquered Plate · 1 os · a long sub-line that also truncates at the row edge"
        price={{ amount: 0.8, unit: 'hr' }}
      />
    </div>
  );
};
