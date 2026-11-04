import { Info } from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@pd2-trader/ui';

export const meta = {
  title: 'Hint',
  description: 'A one-line hint on hover or focus; on touch a tap toggles it and a tap outside closes it. Label icon-only buttons with `aria-label` too.',
  order: 0,
};

export default function TooltipBasicExample() {
  return (
    <div className="flex w-fit items-center gap-6 rounded-lg border bg-surface p-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline"
            size="icon-sm"
            aria-label="Price info">
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Median of 24 trades in the last 7 days</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost"
            size="sm">
            Price check
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Ctrl+D price-checks the hovered item</TooltipContent>
      </Tooltip>
    </div>
  );
}
