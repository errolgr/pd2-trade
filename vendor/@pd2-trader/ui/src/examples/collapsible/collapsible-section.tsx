import {
    Button,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@pd2-trader/ui';
import { ChevronsUpDown } from 'lucide-react';

export const meta = {
  title: 'Show more',
  description:
    'One header with an icon toggle that reveals the rest of a list; the first row stays visible. Use it for a single expandable block instead of an Accordion.',
  order: 0,
};

export default function CollapsibleSectionExample() {
  return (
    <Collapsible
      defaultOpen
      className="flex w-80 flex-col gap-2 rounded-lg border bg-surface p-3 text-xs text-surface-foreground"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Corruptions</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost"
            size="icon-sm"
            aria-label="Toggle corruptions">
            <ChevronsUpDown />
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-3 py-2">+20% Faster Cast Rate</div>
      <CollapsibleContent className="flex flex-col gap-2">
        <div className="rounded-md border px-3 py-2">+1 to All Skills</div>
        <div className="rounded-md border px-3 py-2">Sockets (2)</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
