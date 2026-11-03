import type { Story, StoryDefault } from '@ladle/react';
import { AlertTriangle, CloudOff, Info, PackageOpen } from 'lucide-react';
import { Banner, Button, EmptyState } from '@pd2-trader/ui';

export default { title: 'Overlay / Banner & EmptyState' } satisfies StoryDefault;

export const Banners: Story = () => (
  <div className="flex w-popover flex-col gap-3">
    <Banner tone="info"
      icon={<Info />}
      role="status">
      Price data refreshes every 10 minutes.
    </Banner>
    <Banner
      tone="warning"
      icon={<AlertTriangle />}
      actions={
        <Button size="xs"
          variant="outline">
          Allow
        </Button>
      }
    >
      Allow pd2trader.com to read your stash?
    </Banner>
    <Banner
      tone="destructive"
      icon={<CloudOff />}
      role="alert"
      actions={
        <Button size="xs"
          variant="outline">
          Retry
        </Button>
      }
    >
      Sync failed: could not reach pd2trader.com
    </Banner>
  </div>
);

export const EmptyStates: Story = () => (
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
