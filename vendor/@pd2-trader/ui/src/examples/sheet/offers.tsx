import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@pd2-trader/ui';

const OFFERS = [
  { from: 'Sorc_Errol', price: '1.2 HR' },
  { from: 'HammerDin', price: '1 HR + Um' },
  { from: 'Javazon_77', price: '0.9 HR' },
];

export const meta = {
  title: 'Side panel',
  description: 'A sheet sliding in from the right with header, scrollable body and a footer. Inside an overlay panel it covers the panel, not the screen edge.',
  order: 0,
};

export default function SheetOffersExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open offers</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Trade offers</SheetTitle>
            <SheetDescription>3 offers on Harlequin Crest</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-4 text-sm">
            {OFFERS.map((offer) => (
              <div key={offer.from}
                className="flex justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent">
                <span>{offer.from}</span>
                <span className="tabular-nums text-muted-foreground">{offer.price}</span>
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button>Accept best offer</Button>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
