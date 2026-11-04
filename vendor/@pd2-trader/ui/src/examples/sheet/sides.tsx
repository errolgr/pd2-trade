import { useState } from 'react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@pd2-trader/ui';

const SIDES = ['right', 'left', 'top', 'bottom'] as const;
type Side = (typeof SIDES)[number];

export const meta = {
  title: 'Sides',
  description: '`side` picks the edge. `bottom` is the drawer: use it for mobile-style action trays (there is no separate Drawer component).',
  order: 1,
};

export default function SheetSidesExample() {
  const [side, setSide] = useState<Side | null>(null);
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border bg-surface p-4">
      {SIDES.map((s) => (
        <Button key={s}
          variant="outline"
          size="sm"
          onClick={() => setSide(s)}>
          {s}
        </Button>
      ))}
      <Sheet open={side !== null}
        onOpenChange={(open) => !open && setSide(null)}>
        <SheetContent side={side ?? 'right'}>
          <SheetHeader>
            <SheetTitle>Stash filters</SheetTitle>
            <SheetDescription>Slides in from the {side ?? 'right'}.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}
