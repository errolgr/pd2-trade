import type { Story, StoryDefault } from '@ladle/react';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Dialog' } satisfies StoryDefault;

export const Open: Story = () => (
  <Dialog defaultOpen>
    <DialogTrigger asChild>
      <Button variant="outline">Edit price</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit listing price</DialogTitle>
        <DialogDescription>Harlequin Crest · Shako · 141 defense</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dlg-price">Price (HR)</Label>
        <Input id="dlg-price"
          defaultValue="1.5" />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button>Save</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
