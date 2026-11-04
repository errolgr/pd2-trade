import { Badge } from '@pd2-trader/ui';

export const meta = {
  title: 'In context',
  description: 'Badges trailing item names in a list; item names carry quality color, the badge stays neutral.',
  order: 1,
};

export default function InContextExample() {
  return (
    <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-q-unique">Harlequin Crest</span>
        <Badge variant="outline">3 os</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-q-set">Tal Rasha&apos;s Guardianship</span>
        <Badge variant="secondary">Set</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-q-rare">Grim Shell</span>
        <Badge variant="destructive">Corrupted</Badge>
      </div>
    </div>
  );
}
