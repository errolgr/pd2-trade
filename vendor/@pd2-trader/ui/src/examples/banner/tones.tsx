import { Banner, Button } from '@pd2-trader/ui';

import { AlertTriangle, CheckCircle2, CloudOff, Info } from 'lucide-react';

export const meta = {
  title: 'Tones',
  description: 'Info, success, warning and destructive banners with an icon and optional actions; set `role="alert"` for failures and `"status"` for notices.',
  order: 0,
};

export default function BannersExample() {
  return (
    <div className="flex w-popover flex-col gap-3">
      <Banner tone="info"
        icon={<Info />}
        role="status">
        Price data refreshes every 10 minutes.
      </Banner>
      <Banner tone="success"
        icon={<CheckCircle2 />}
        role="status">
        Stash synced: 412.5 HR across 4 tabs.
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
}
