import { Progress } from '@pd2-trader/ui';

export const meta = {
  title: 'Tones',
  description: '`tone` colours the bar for status: quota used, sync health, a failing import.',
  order: 1,
};

export default function TonesExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4 text-2xs text-muted-foreground">
      {(
        [
          ['default', 'Scanning stash', 40],
          ['success', 'Synced listings', 100],
          ['warning', 'Listing quota', 85],
          ['danger', 'Import failed', 30],
        ] as const
      ).map(([tone, label, value]) => (
        <div key={tone}
          className="flex flex-col gap-1">
          <span>{label} · {value}%</span>
          <Progress tone={tone}
            value={value}
            aria-label={label} />
        </div>
      ))}
    </div>
  );
}
