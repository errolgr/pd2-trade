import { ModeBadge } from '@pd2-trader/ui';

export const meta = {
  title: 'Modes',
  description: 'Ladder / non-ladder, softcore / hardcore (red), season, classic and dead; `size="short"` for dense rows.',
  order: 1,
};

export default function ModesExample() {
  return (
    <div className="flex w-popover flex-col gap-2 rounded-lg border bg-surface p-4">
      <ModeBadge ladder
        hardcore={false}
        season={12} />
      <ModeBadge ladder={false}
        hardcore />
      <ModeBadge ladder
        hardcore
        dead />
      <ModeBadge ladder={false}
        hardcore={false}
        classic />
      <ModeBadge ladder
        hardcore
        season={12}
        size="short" />
    </div>
  );
}
