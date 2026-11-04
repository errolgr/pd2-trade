import { ResistanceBar } from '@pd2-trader/ui';

export const meta = {
  title: 'Hell resistances',
  description: 'A Hell sheet: fire over the cap, cold capped at 80 with +5 max res, lightning short of the cap, poison negative.',
  order: 1,
};

export default function HellResistsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-4">
      <ResistanceBar element="fire"
        total={98} />
      <ResistanceBar element="cold"
        total={80}
        max={80} />
      <ResistanceBar element="lightning"
        total={61} />
      <ResistanceBar element="poison"
        total={-14} />
    </div>
  );
}
