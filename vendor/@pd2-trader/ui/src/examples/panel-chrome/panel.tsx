import { Button, PanelChrome, PanelSurface } from '@pd2-trader/ui';

import { Coins, RefreshCw } from 'lucide-react';

const Body = () => (
  <div className="flex flex-col gap-2 p-3 text-xs">
    <p className="text-muted-foreground">Rune exchange rates, last 24h</p>
    <div className="flex justify-between">
      <span className="text-q-rune">Ber</span>
      <span className="tabular-nums">1.00 HR</span>
    </div>
    <div className="flex justify-between">
      <span className="text-q-rune">Jah</span>
      <span className="tabular-nums">0.95 HR</span>
    </div>
    <div className="flex justify-between">
      <span className="text-q-rune">Lo</span>
      <span className="tabular-nums">0.42 HR</span>
    </div>
  </div>
);

export const meta = {
  title: 'Panel',
  description:
    'The standard overlay window: PanelSurface with a PanelChrome bar (grip, icon, title, an action and the close button).',
  order: 0,
};

export default function PanelExample() {
  return (
    <PanelSurface className="w-sidebar">
      <PanelChrome
        title="Currency"
        icon={<Coins />}
        onClose={() => undefined}
        actions={
          <Button size="icon-sm"
            variant="ghost"
            aria-label="Refresh">
            <RefreshCw />
          </Button>
        }
      />
      <Body />
    </PanelSurface>
  );
}
