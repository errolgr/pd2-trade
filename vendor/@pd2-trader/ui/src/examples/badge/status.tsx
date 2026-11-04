import { Badge } from '@pd2-trader/ui';
import { Check } from 'lucide-react';

export const meta = {
  title: 'Status tones',
  description: 'Tinted status badges (`success`, `warning`, `info`, `danger`, `muted`) for states like plugin enabled, update available or sync failed. Solid `destructive` stays for strong warnings.',
  order: 2,
};

export default function BadgeStatusExample() {
  return (
    <div className="flex w-fit flex-wrap items-center gap-2 rounded-lg border bg-surface p-4">
      <Badge variant="success">
        <Check /> Enabled
      </Badge>
      <Badge variant="warning">Update available</Badge>
      <Badge variant="info">Beta</Badge>
      <Badge variant="danger">Sync failed</Badge>
      <Badge variant="muted">Disabled</Badge>
    </div>
  );
}
