import type { Story, StoryDefault } from '@ladle/react';
import { Coins, RefreshCw, Search, Settings } from 'lucide-react';
import { Button, Input, PanelChrome, PanelSurface } from '@pd2-trader/ui';

export default { title: 'Overlay / PanelChrome' } satisfies StoryDefault;

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

export const Panel: Story = () => (
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

export const Variations: Story = () => (
  <div className="flex flex-col gap-4">
    <PanelSurface className="w-160">
      <PanelChrome
        title="Market"
        icon={<Search />}
        center={<Input className="h-7 w-48"
          placeholder="Search listings…" />}
        onClose={() => undefined}
      />
      <Body />
    </PanelSurface>
    <PanelSurface className="w-popover">
      <PanelChrome title="Price check"
        diabloFont
        onClose={() => undefined} />
      <Body />
    </PanelSurface>
    <PanelSurface className="w-popover">
      <PanelChrome
        title="Settings — no drag region, no close"
        icon={<Settings />}
        dragRegion={false}
      />
      <Body />
    </PanelSurface>
    <PanelSurface className="w-popover">
      <PanelChrome title="A very long panel title that truncates before the actions and close button"
        onClose={() => undefined} />
      <Body />
    </PanelSurface>
  </div>
);

export const AnimatedSurface: Story = () => (
  <PanelSurface className="w-sidebar"
    animate>
    <PanelChrome title="Animated in"
      onClose={() => undefined} />
    <Body />
  </PanelSurface>
);
