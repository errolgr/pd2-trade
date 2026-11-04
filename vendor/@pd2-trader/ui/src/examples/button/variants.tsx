import { Button } from '@pd2-trader/ui';

import { Search } from 'lucide-react';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'quiet', 'field'] as const;

export const meta = {
  title: 'Variants',
  description: 'Every variant at rest, disabled and with a leading icon. `default` is the one main action of a surface; `field` is a picker trigger.',
  order: 0,
};

export default function VariantsExample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
      {VARIANTS.map((variant) => (
        <div key={variant}
          className="flex items-center gap-3">
          <span className="w-20 text-2xs text-muted-foreground">{variant}</span>
          <Button variant={variant}>List item</Button>
          <Button variant={variant}
            disabled>
            Disabled
          </Button>
          <Button variant={variant}>
            <Search /> Search trades
          </Button>
        </div>
      ))}
    </div>
  );
}
