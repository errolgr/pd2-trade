import type { Story, StoryDefault } from '@ladle/react';
import { ChevronsUpDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Accordion & Collapsible' } satisfies StoryDefault;

export const AccordionFaq: Story = () => (
  <div className="w-96 rounded-lg border bg-surface px-4 text-surface-foreground">
    <Accordion type="single"
      collapsible
      defaultValue="hr">
      <AccordionItem value="hr">
        <AccordionTrigger>What is an HR?</AccordionTrigger>
        <AccordionContent className="text-xs text-muted-foreground">
          High runes are the trade currency, so prices are quoted in HR (high-rune value).
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="safe">
        <AccordionTrigger>Does the overlay read my account?</AccordionTrigger>
        <AccordionContent className="text-xs text-muted-foreground">
          Only your stash and listings, read-only, after you sign in with PD2.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="disabled"
        disabled>
        <AccordionTrigger>Disabled item</AccordionTrigger>
        <AccordionContent>Hidden</AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);

export const CollapsibleSection: Story = () => (
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
