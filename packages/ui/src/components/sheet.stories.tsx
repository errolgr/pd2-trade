import type { Story, StoryDefault } from '@ladle/react';
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

export default { title: 'Primitives / Sheet' } satisfies StoryDefault;

const Content = ({ side }: { side: 'right' | 'left' | 'top' | 'bottom' }) => (
  <SheetContent side={side}>
    <SheetHeader>
      <SheetTitle>Trade offers</SheetTitle>
      <SheetDescription>3 offers on Harlequin Crest</SheetDescription>
    </SheetHeader>
    <div className="flex flex-col gap-2 px-4 text-xs">
      <p>Sorc_Errol · 1.2 HR</p>
      <p>HammerDin · 1 HR + Um</p>
      <p>Javazon_77 · 0.9 HR</p>
    </div>
    <SheetFooter>
      <SheetClose asChild>
        <Button variant="outline">Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
);

export const Right: Story = () => (
  <Sheet defaultOpen>
    <SheetTrigger asChild>
      <Button variant="outline">Open offers</Button>
    </SheetTrigger>
    <Content side="right" />
  </Sheet>
);

export const Bottom: Story = () => (
  <Sheet defaultOpen>
    <SheetTrigger asChild>
      <Button variant="outline">Open offers</Button>
    </SheetTrigger>
    <Content side="bottom" />
  </Sheet>
);
