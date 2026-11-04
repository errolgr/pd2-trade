import { Badge } from '@pd2-trader/ui';

export const meta = {
  title: 'Variants',
  description: 'The four variants: `default` for the one emphasized tag, `secondary` and `outline` for neutral metadata, `destructive` for warnings like corrupted.',
  order: 0,
};

export default function VariantsExample() {
  return (
    <div className="flex w-fit items-center gap-2 rounded-lg border bg-surface p-4">
      <Badge>Ladder</Badge>
      <Badge variant="secondary">Softcore</Badge>
      <Badge variant="outline">Ethereal</Badge>
      <Badge variant="destructive">Corrupted</Badge>
    </div>
  );
}
