import { Progress } from '@pd2-trader/ui';

export const meta = {
  title: 'Values',
  description: 'Determinate progress from 0 to 100 for a long task such as a stash scan; pair it with a text label.',
  order: 0,
};

export default function ValuesExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4 text-2xs text-muted-foreground">
      {[0, 15, 60, 100].map((value) => (
        <div key={value}
          className="flex flex-col gap-1">
          <span>Scanning stash · {value}%</span>
          <Progress value={value} />
        </div>
      ))}
    </div>
  );
}
