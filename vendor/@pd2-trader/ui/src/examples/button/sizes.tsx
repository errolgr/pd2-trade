import { Button } from '@pd2-trader/ui';
import { Copy, RefreshCw, Settings, X } from 'lucide-react';

const SIZES = ['xs', 'sm', 'default', 'lg'] as const;

export const meta = {
  title: 'Sizes',
  description: 'Text sizes `xs` to `lg`, and the square icon sizes used in chrome bars and row actions (icon-only buttons need an `aria-label`).',
  order: 1,
};

export default function SizesExample() {
  return (
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
}
