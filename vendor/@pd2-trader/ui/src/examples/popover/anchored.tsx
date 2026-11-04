import { useState } from 'react';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@pd2-trader/ui';

export const meta = {
  title: 'Anchored',
  description: '`PopoverAnchor` positions the popover against an element that is not the trigger (a stash cell) while `open` is driven from elsewhere.',
  order: 1,
};

export default function PopoverAnchoredExample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-surface p-4">
      <Popover open={open}
        onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex size-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Cell 3,4
          </div>
        </PopoverAnchor>
        <PopoverContent side="right"
          className="w-56 text-xs">
          Ber Rune · listed for 1 HR
        </PopoverContent>
      </Popover>
      <Button variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} cell details
      </Button>
    </div>
  );
}
