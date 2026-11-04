import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@pd2-trader/ui';

export const meta = {
  title: 'Single, collapsible',
  description:
    '`type="single" collapsible` with a default open item and a disabled item: FAQ-style docs and help panels where one answer is open at a time.',
  order: 0,
};

export default function AccordionFaqExample() {
  return (
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
}
