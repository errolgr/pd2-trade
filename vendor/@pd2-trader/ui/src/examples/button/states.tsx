import { Button } from '@pd2-trader/ui';

import { Loader2 } from 'lucide-react';

export const meta = {
  title: 'States',
  description: 'Busy (`disabled` + spinning icon, label ends in …), destructive and disabled.',
  order: 2,
};

export default function StatesExample() {
  return (
    <div className="flex w-fit items-center gap-3 rounded-lg border bg-surface p-4">
      <Button>Ready</Button>
      <Button disabled>
        <Loader2 className="animate-spin" /> Listing…
      </Button>
      <Button variant="destructive">Delist all</Button>
      <Button variant="outline"
        disabled>
        Bump (cooldown)
      </Button>
    </div>
  );
}
