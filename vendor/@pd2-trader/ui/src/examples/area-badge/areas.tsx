import { AreaBadge } from '@pd2-trader/ui';

export const meta = {
  title: 'Areas, maps, corrupted zone',
  description: 'Plain areas, PD2 maps with their tier (T3 glows), and the current corrupted zone in its color with a timer.',
  order: 1,
};

export default function AreasExample() {
  return (
    <div className="flex w-popover flex-col items-start gap-2 rounded-lg border bg-surface p-4">
      <AreaBadge name="Chaos Sanctuary"
        meta="Act 4" />
      <AreaBadge name="Ruins of Viz-Jun"
        tier={1} />
      <AreaBadge name="Phlegethon"
        tier={2} />
      <AreaBadge name="Throne of Insanity"
        tier={3} />
      <AreaBadge name="Ancient Tunnels"
        corrupted
        meta="ends in 12m" />
    </div>
  );
}
