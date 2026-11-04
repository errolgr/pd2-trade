import { Button, EmptyState } from '@pd2-trader/ui';

import { PackageOpen } from 'lucide-react';

export const meta = {
  title: 'Variants',
  description: 'Full empty state with description and action, and `compact` versions for small panels and table bodies.',
  order: 0,
};

export default function EmptyStatesExample() {
  return (
    <div className="flex w-popover flex-col gap-4">
      <EmptyState
        icon={<PackageOpen />}
        title="No listings yet"
        description="Price-check an item in game (Ctrl+D) and list it from the popover."
        action={<Button size="sm">List an item</Button>}
      />
      <EmptyState compact
        icon={<PackageOpen />}
        title="No trades in the last 7 days" />
      <EmptyState compact
        title="Title only" />
    </div>
  );
}
