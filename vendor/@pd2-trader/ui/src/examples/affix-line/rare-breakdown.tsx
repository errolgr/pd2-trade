import { AffixLine } from '@pd2-trader/ui';

export const meta = {
  title: 'Rare breakdown',
  description: 'A rare circlet by affix: prefixes, suffixes, the crafted and corrupted lines, rolled values marked inside their ranges.',
  order: 1,
};

export default function RareBreakdownExample() {
  return (
    <div className="flex w-popover flex-col gap-1 rounded-lg border bg-surface p-4">
      <AffixLine kind="implicit">+2 to Sorceress Skill Levels</AffixLine>
      <AffixLine kind="prefix"
        affix="Arch-Angel's"
        range={[1, 2]}
        value={2}>+2 to All Skills</AffixLine>
      <AffixLine kind="prefix"
        affix="Lord's"
        range={[11, 20]}
        value={17}>+17% to All Resistances</AffixLine>
      <AffixLine kind="suffix"
        affix="of the Magus"
        range={[10, 20]}
        value={20}>+20% Faster Cast Rate</AffixLine>
      <AffixLine kind="suffix"
        affix="of Vita"
        range={[31, 40]}
        value={34}>+34 to Life</AffixLine>
      <AffixLine kind="crafted">+5% Faster Run/Walk</AffixLine>
      <AffixLine kind="corrupted">+1 Socket</AffixLine>
    </div>
  );
}
