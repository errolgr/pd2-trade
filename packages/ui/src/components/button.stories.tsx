import type { Story, StoryDefault } from '@ladle/react';
import { ChevronDown, Copy, Loader2, RefreshCw, Search, Settings, X } from 'lucide-react';
import { Button } from '@pd2-trader/ui';

export default { title: 'Primitives / Button' } satisfies StoryDefault;

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'quiet', 'field'] as const;
const SIZES = ['xs', 'sm', 'default', 'lg'] as const;

export const Variants: Story = () => (
  <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
    {VARIANTS.map((variant) => (
      <div key={variant}
        className="flex items-center gap-3">
        <span className="w-20 text-2xs text-muted-foreground">{variant}</span>
        <Button variant={variant}>List item</Button>
        <Button variant={variant}
          disabled>
          Disabled
        </Button>
        <Button variant={variant}>
          <Search /> Search trades
        </Button>
      </div>
    ))}
  </div>
);

export const Sizes: Story = () => (
  <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
    <div className="flex items-center gap-3">
      {SIZES.map((size) => (
        <Button key={size}
          size={size}>
          Size {size}
        </Button>
      ))}
    </div>
    <div className="flex items-center gap-3">
      <Button size="icon"
        variant="outline"
        aria-label="Settings">
        <Settings />
      </Button>
      <Button size="icon-sm"
        variant="outline"
        aria-label="Refresh">
        <RefreshCw />
      </Button>
      <Button size="icon-xs"
        variant="ghost"
        aria-label="Copy">
        <Copy />
      </Button>
      <Button size="icon-2xs"
        variant="ghost"
        aria-label="Close">
        <X />
      </Button>
    </div>
  </div>
);

export const States: Story = () => (
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

export const RowsAndInline: Story = () => (
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
