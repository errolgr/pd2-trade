import { Button, ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea } from '@pd2-trader/ui';
import { useState } from 'react';

const LISTINGS = [
  { name: 'Harlequin Crest', price: '1.45 HR' },
  { name: 'Ber Rune', price: '1.00 HR' },
  { name: "Griffon's Eye", price: '3.20 HR' },
  { name: 'Enigma Mage Plate', price: '6.50 HR' },
  { name: 'Jah Rune', price: '0.95 HR' },
];

export const meta = {
  title: 'List and detail',
  description:
    'A horizontal split like the market browser: listings on the left, the selected item on the right. `withHandle` shows the grip; sizes are percentages with min/max limits.',
  order: 0,
};

export default function ResizableMarketSplitExample() {
  const [selected, setSelected] = useState(LISTINGS[0]);
  return (
    <div className="h-72 w-160 overflow-hidden rounded-lg border bg-surface text-surface-foreground">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={40}
          minSize={25}
          maxSize={60}>
          <ScrollArea className="h-full">
            <div className="flex flex-col p-1">
              {LISTINGS.map((l) => (
                <Button key={l.name}
                  variant="ghost"
                  size="row"
                  aria-selected={l === selected}
                  onClick={() => setSelected(l)}>
                  <span className="flex-1 truncate">{l.name}</span>
                  <span className="tabular-nums text-muted-foreground">{l.price}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <div className="flex h-full flex-col gap-1 p-4">
            <span className="text-sm font-semibold text-q-unique">{selected.name}</span>
            <span className="text-xs text-muted-foreground">Asking {selected.price} · Hell cows ladder</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
