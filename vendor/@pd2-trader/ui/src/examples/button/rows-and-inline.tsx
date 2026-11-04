import { Button } from '@pd2-trader/ui';

import { ChevronDown } from 'lucide-react';

export const meta = {
  title: 'Rows and inline actions',
  description: '`size="row"` list rows (selected via `aria-selected` / `aria-current`), a `field` picker trigger and a `quiet` inline text action.',
  order: 3,
};

export default function RowsAndInlineExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-2">
      <div className="flex flex-col">
        <Button variant="ghost"
          size="row">
          Harlequin Crest
        </Button>
        <Button variant="ghost"
          size="row"
          aria-selected>
          Shako (selected)
        </Button>
        <Button variant="ghost"
          size="row"
          aria-current>
          Griffon&apos;s Eye (current)
        </Button>
      </div>
      <Button variant="field"
        className="w-full">
        Select a base… <ChevronDown />
      </Button>
      <p className="px-2 text-xs text-muted-foreground">
        3 filters active.{' '}
        <Button variant="quiet"
          size="inline">
          Clear
        </Button>
      </p>
    </div>
  );
}
