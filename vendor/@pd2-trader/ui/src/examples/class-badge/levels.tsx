import { ClassBadge, classPortraitUrl } from '@pd2-trader/ui';

export const meta = {
  title: 'Class names',
  description: 'Class name in its class color, optional level and portrait; API spellings (`Sorceress`, `necro`, `pala`) resolve.',
  order: 1,
};

const ORIGIN = 'https://pd2trader.com';

export default function LevelsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-4">
      <ClassBadge cls="Sorceress"
        level={94}
        src={classPortraitUrl('sorceress', ORIGIN)} />
      <ClassBadge cls="necro"
        level={91}
        src={classPortraitUrl('necromancer', ORIGIN)} />
      <ClassBadge cls="pala"
        level={89}
        src={null} />
      <ClassBadge cls="Druid"
        src={false} />
    </div>
  );
}
